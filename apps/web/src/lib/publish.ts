/**
 * Publish a component to the caller's namespace. Owner-scoped; validates and
 * sanitizes the registry-item shape before writing an immutable version plus
 * its files. Maps the free/paid choice onto the catalog source model.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, isNotNull } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { normalizeDomain } from "./domains";
import { isCategoryId } from "./taxonomy";
import { verifyShadcnParity } from "./parity";
import { scanFilesForSecrets, SECRET_SCAN_TOOL } from "./secret-scan";
import { fireReviewWebhook } from "./review";
import { POLICY_VERSION } from "./publishing-policy";
import { roleFor } from "./scaffold";
import { stripSrc } from "./registry";
import { contentDigest } from "./digest";

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const ALLOWED_EXTENSIONS = new Set(["tsx", "ts", "jsx", "js", "css", "json"]);
const ALL_CHANNELS = ["shadcn", "modulora-cli", "compatible-cli"] as const;
const MAX_FILES = 25;
const MAX_FILE_BYTES = 200 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024;

export interface PublishFile {
  path: string;
  content: string;
}

export interface PublishInput {
  name: string;
  title: string;
  description: string;
  category: string;
  version: string;
  pricing: "free" | "paid";
  purchaseUrl: string;
  distributionChannels: string[];
  shadcnCommand: string;
  otherCliCommand: string;
  originalUrl: string;
  inspiredBy: string[];
  files: PublishFile[];
  acceptPolicy: boolean;
  /** Save without submitting for review — no policy gate, skips the queue. */
  draft?: boolean;
}

export interface PublishResult {
  ok: boolean;
  error?: string;
  namespace?: string;
  name?: string;
  version?: string;
  status?: "pending";
}

/** Next patch version, or 0.1.0 for a brand-new component. */
function nextVersion(existing: string[]): string {
  let best: [number, number, number] | null = null;
  for (const raw of existing) {
    const match = raw.match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) continue;
    const parsed: [number, number, number] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (!best || parsed[0] > best[0] || (parsed[0] === best[0] && (parsed[1] > best[1] || (parsed[1] === best[1] && parsed[2] > best[2])))) {
      best = parsed;
    }
  }
  if (!best) return "0.1.0";
  return `${best[0]}.${best[1]}.${best[2] + 1}`;
}

/** Reject path traversal, absolute paths, and disallowed file types. */
function validatePath(path: string): string | null {
  const clean = path.trim();
  if (!clean) return "File paths cannot be empty.";
  if (clean.startsWith("/") || /^[a-zA-Z]:/.test(clean)) {
    return `Absolute paths are not allowed: ${clean}`;
  }
  if (clean.includes("\\")) return `Use forward slashes: ${clean}`;
  if (clean.split("/").some((part) => part === "..")) {
    return `Path traversal is not allowed: ${clean}`;
  }
  const extension = clean.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return `Unsupported file type: ${clean}`;
  }
  return null;
}

export const publishComponent = createServerFn({ method: "POST" })
  .validator((data: PublishInput) => data)
  .handler(async ({ data }): Promise<PublishResult> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "No request context." };
    return publishCore(data, request);
  });

/**
 * The publish pipeline — shared by the web editor (server fn above) and the
 * authenticated API used by `modulora publish`. Same validation, same
 * curator-review gate, no divergence.
 */
export async function publishCore(data: PublishInput, request: Request): Promise<PublishResult> {
  {
    const user = await getCurrentUser(request);
    if (!user) return { ok: false, error: "You must be signed in." };
    if (!user.username) return { ok: false, error: "Claim a username first." };
    const isDraft = data.draft === true;
    if (!isDraft && data.acceptPolicy !== true) {
      return { ok: false, error: "Accept the publishing policy to submit." };
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return { ok: false, error: "Database is not configured." };

    // ── Validation ────────────────────────────────────────────
    const name = String(data.name ?? "").trim().toLowerCase();
    if (!NAME_PATTERN.test(name)) {
      return { ok: false, error: "Name: 2–40 chars, lowercase letters, numbers, single hyphens." };
    }
    const title = String(data.title ?? "").trim();
    if (!title || title.length > 80) return { ok: false, error: "Title is required (≤80 chars)." };
    const description = String(data.description ?? "").trim().slice(0, 280);
    if (!isCategoryId(data.category)) return { ok: false, error: "Choose a valid category." };
    // Version is managed by Modulora, not entered by creators: 0.1.0 for a new
    // component, then an automatic patch bump on each republish.

    const files = (data.files ?? []).filter((file) => file.path.trim());
    if (files.length === 0) return { ok: false, error: "Add at least one file." };
    if (files.length > MAX_FILES) return { ok: false, error: `Too many files (max ${MAX_FILES}).` };

    const seen = new Set<string>();
    let total = 0;
    for (const file of files) {
      const pathError = validatePath(file.path);
      if (pathError) return { ok: false, error: pathError };
      const normalized = file.path.trim();
      if (seen.has(normalized)) return { ok: false, error: `Duplicate file: ${normalized}` };
      seen.add(normalized);
      const bytes = new TextEncoder().encode(file.content).length;
      if (bytes > MAX_FILE_BYTES) return { ok: false, error: `File too large: ${normalized}` };
      total += bytes;
    }
    if (total > MAX_TOTAL_BYTES) return { ok: false, error: "Component exceeds the 1 MB size limit." };

    // Role split: only component files ship in the install payload. Demos,
    // styles, and system files exist for the live preview sandbox.
    const installFiles = files.filter((file) => roleFor(file.path.trim()) === "component");
    // Digest over the canonical served form (src/ stripped) so the published
    // digest matches what /r/ serves and what the CLI computes on install.
    const digestFiles = installFiles.map((f) => ({ path: stripSrc(f.path), content: f.content }));
    if (data.pricing !== "paid" && installFiles.length === 0 && !isDraft) {
      return { ok: false, error: "Add at least one component file under src/components/." };
    }

    const isPaid = data.pricing === "paid";
    const purchaseUrl = String(data.purchaseUrl ?? "").trim();
    if (isPaid && !isDraft) {
      if (!/^https?:\/\//i.test(purchaseUrl)) {
        return { ok: false, error: "Paid components need a purchase URL." };
      }
      // The purchase URL must live on a domain this creator has verified —
      // the docs promised this gate; enforce it for real.
      const host = normalizeDomain(purchaseUrl);
      const owned = host
        ? await drizzle(neon(databaseUrl), { schema })
            .select({ id: schema.verifiedDomains.id })
            .from(schema.verifiedDomains)
            .where(
              and(
                eq(schema.verifiedDomains.ownerUserId, user.id),
                eq(schema.verifiedDomains.domain, host),
                isNotNull(schema.verifiedDomains.verifiedAt),
              ),
            )
            .limit(1)
        : [];
      if (owned.length === 0) {
        return {
          ok: false,
          error: `Purchase URL must be on a domain you've verified (${host ?? "invalid URL"}). Verify it in Settings first.`,
        };
      }
    }
    const channels = ALL_CHANNELS.filter((channel) => data.distributionChannels?.includes(channel));
    if (channels.length === 0) return { ok: false, error: "Enable at least one distribution channel." };

    // Creator-run channels require the install command; default to the
    // canonical one when omitted (the API path — the editor pre-fills it).
    let shadcnCommand = String(data.shadcnCommand ?? "").trim();
    if (channels.includes("shadcn") && !shadcnCommand) {
      shadcnCommand = `npx shadcn@latest add https://modulora.dev/r/@${user.username}/${name}`;
    }
    const otherCliCommand = String(data.otherCliCommand ?? "").trim();
    if (channels.includes("compatible-cli") && !otherCliCommand) {
      return { ok: false, error: "Enter the command for other CLIs." };
    }

    // Install parity: a shadcn command should install the code they uploaded.
    // Own-registry commands are trusted; external URLs are fetched + compared;
    // namespace references (no URL) are legitimate but unverifiable. Only a
    // confirmed mismatch blocks the publish.
    let parity: Awaited<ReturnType<typeof verifyShadcnParity>> = { status: "unverifiable" };
    if (!isPaid && channels.includes("shadcn") && installFiles.length > 0) {
      parity = await verifyShadcnParity(shadcnCommand, installFiles);
      if (parity.status === "mismatch") return { ok: false, error: parity.error };
    }

    // Provenance links (optional). Validate any provided URLs.
    const originalUrl = String(data.originalUrl ?? "").trim();
    if (originalUrl && !/^https?:\/\//i.test(originalUrl)) {
      return { ok: false, error: "Original URL must start with http(s)." };
    }
    const inspiredBy = (data.inspiredBy ?? [])
      .map((url) => String(url).trim())
      .filter(Boolean)
      .slice(0, 8);
    if (inspiredBy.some((url) => !/^https?:\/\//i.test(url))) {
      return { ok: false, error: "Inspired-by links must start with http(s)." };
    }

    // ── Persistence ───────────────────────────────────────────
    const db = drizzle(neon(databaseUrl), { schema });
    const [ns] = await db
      .select({ id: schema.namespaces.id })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, user.username))
      .limit(1);
    if (!ns) return { ok: false, error: "Your namespace is missing." };

    const sourceModel = isPaid ? "external-commercial" : "open-source";
    const registryItem = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name,
      type: "registry:component",
      title,
      description,
      files: isPaid
        ? []
        : installFiles.map((file) => ({ path: stripSrc(file.path), content: file.content, type: "registry:component" })),
    };

    // Upsert the component row.
    const [existing] = await db
      .select({ id: schema.components.id })
      .from(schema.components)
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.components.name, name)))
      .limit(1);

    let componentId = existing?.id;
    if (componentId) {
      await db
        .update(schema.components)
        .set({
          title,
          description,
          category: data.category,
          sourceModel,
          itemType: "registry:component",
          distributionChannels: channels,
          shadcnCommand: channels.includes("shadcn") ? shadcnCommand : null,
          otherCliCommand: channels.includes("compatible-cli") ? otherCliCommand : null,
          originalUrl: originalUrl || null,
          inspiredBy,
          purchaseUrl: isPaid ? purchaseUrl : null,
          // Any new submission re-enters curation before it is public again;
          // drafts stay out of the queue until the creator submits.
          reviewStatus: isDraft ? "draft" : "pending",
          reviewReason: null,
          reviewedBy: null,
          reviewedAt: null,
          submittedAt: isDraft ? undefined : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.components.id, componentId));
    } else {
      const [created] = await db
        .insert(schema.components)
        .values({
          namespaceId: ns.id,
          name,
          title,
          description,
          category: data.category,
          framework: "react",
          itemType: "registry:component",
          sourceModel,
          distributionChannels: channels,
          shadcnCommand: channels.includes("shadcn") ? shadcnCommand : null,
          otherCliCommand: channels.includes("compatible-cli") ? otherCliCommand : null,
          originalUrl: originalUrl || null,
          inspiredBy,
          purchaseUrl: isPaid ? purchaseUrl : null,
          reviewStatus: isDraft ? "draft" : "pending",
        })
        .returning({ id: schema.components.id });
      componentId = created!.id;
    }

    // Versions are immutable; compute the next one automatically.
    const existingVersions = await db
      .select({ version: schema.componentVersions.version })
      .from(schema.componentVersions)
      .where(eq(schema.componentVersions.componentId, componentId));
    const version = nextVersion(existingVersions.map((row) => row.version));

    const [createdVersion] = await db
      .insert(schema.componentVersions)
      .values({
        componentId,
        version,
        licenseKind: isPaid ? "commercial" : "spdx",
        spdxExpression: isPaid ? null : "MIT",
        registryItem,
      })
      .returning({ id: schema.componentVersions.id });

    if (!isPaid) {
      await db.insert(schema.componentFiles).values(
        files.map((file, index) => ({
          componentVersionId: createdVersion!.id,
          path: file.path.trim(),
          fileType: "registry:component",
          role: roleFor(file.path.trim()),
          content: file.content,
          sizeBytes: new TextEncoder().encode(file.content).length,
          orderIndex: index,
        })),
      );
    }

    // Record honest, scoped evidence for this exact release. Every record is
    // something we can actually prove — no fabricated "signed"/"verified" badges.
    const evidence: (typeof schema.evidenceRecords.$inferInsert)[] = [
      {
        componentVersionId: createdVersion!.id,
        type: "publisher-identity",
        status: "passed",
        issuer: "modulora-platform",
        scope: `Published by the authenticated account @${user.username}.`,
        limitations: "Confirms who published this release, not the safety of its code.",
      },
    ];

    if (!isPaid && installFiles.length > 0) {
      const digest = await contentDigest(digestFiles);
      evidence.push({
        componentVersionId: createdVersion!.id,
        type: "content-integrity",
        status: "passed",
        issuer: "modulora-platform",
        toolVersion: "sha256",
        scope: `Install delivers exactly these ${installFiles.length} file(s) — digest sha256:${digest.slice(0, 16)}…`,
        limitations: "The Modulora CLI copies files and never runs install scripts; it verifies this digest before writing.",
      });
      const scan = scanFilesForSecrets(files);
      evidence.push({
        componentVersionId: createdVersion!.id,
        type: "secret-scan",
        status: scan.clean ? "passed" : "failed",
        issuer: "modulora-platform",
        toolVersion: SECRET_SCAN_TOOL,
        scope: scan.clean ? undefined : scan.findings.slice(0, 5).join("; "),
        limitations:
          "Pattern-based scan of published files only; cannot prove the absence of unknown or obfuscated secrets.",
      });
      if (channels.includes("shadcn")) {
        if (parity.status === "trusted" || parity.status === "verified") {
          evidence.push({
            componentVersionId: createdVersion!.id,
            type: "install-parity",
            status: "passed",
            issuer: "modulora-platform",
            scope: parity.scope,
            limitations: "Verified at publish time; an external registry URL may change afterward.",
          });
        } else if (parity.status === "unverifiable") {
          evidence.push({
            componentVersionId: createdVersion!.id,
            type: "install-parity",
            status: "warning",
            issuer: "modulora-platform",
            scope: "The shadcn command installs from a creator-controlled registry Modulora can't fetch.",
            limitations: "Modulora cannot confirm the installed code matches these files. Use the Modulora registry for a verified guarantee.",
          });
        }
      }
    } else if (isPaid) {
      evidence.push({
        componentVersionId: createdVersion!.id,
        type: "source-not-assessed",
        status: "asserted",
        issuer: "modulora-platform",
        scope: "Paid source is fulfilled by the creator and is not available to Modulora.",
        limitations: "Modulora has not received, scanned, or reviewed this source.",
      });
    }

    await db.insert(schema.evidenceRecords).values(evidence);

    await db
      .update(schema.components)
      .set({ latestVersionId: createdVersion!.id, updatedAt: new Date() })
      .where(eq(schema.components.id, componentId));

    if (!isPaid && installFiles.length > 0) {
      await db
        .update(schema.componentVersions)
        .set({ contentSha256: await contentDigest(digestFiles) })
        .where(eq(schema.componentVersions.id, createdVersion!.id));
    }

    // Announce the submission to the curation channel. The component stays
    // pending and hidden from browse until a curator approves it.
    const origin = (() => {
      try {
        return new URL(getRequest()!.url).origin;
      } catch {
        return "https://modulora.dev";
      }
    })();
    await fireReviewWebhook({
      componentId,
      title,
      username: user.username,
      name,
      category: data.category,
      paid: isPaid,
      origin,
    });

    // Record policy acceptance for audit (the current version, at submit time).
    await db
      .update(schema.users)
      .set({ publishingPolicyVersion: POLICY_VERSION, publishingPolicyAcceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    // Awaited: dangling promises are cancelled in the Workers runtime, so
    // fire-and-forget emails silently vanish. sendEmail never throws.
    if (!isDraft) {
      const { emailSubmissionReceived } = await import("./email");
      await emailSubmissionReceived(user.email, title, `@${user.username}/${name}`);
    }

    return { ok: true, namespace: user.username, name, version, status: "pending" as const };
  }
}
