/**
 * Publish a component to the caller's namespace. Owner-scoped; validates and
 * sanitizes the registry-item shape before writing an immutable version plus
 * its files. Maps the free/paid choice onto the catalog source model.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { isCategoryId } from "./taxonomy";

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
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
}

export interface PublishResult {
  ok: boolean;
  error?: string;
  namespace?: string;
  name?: string;
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
    const user = await getCurrentUser(request);
    if (!user) return { ok: false, error: "You must be signed in." };
    if (!user.username) return { ok: false, error: "Claim a username first." };

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
    const version = String(data.version ?? "").trim();
    if (!VERSION_PATTERN.test(version)) return { ok: false, error: "Version must be x.y.z." };

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

    const isPaid = data.pricing === "paid";
    const purchaseUrl = String(data.purchaseUrl ?? "").trim();
    if (isPaid && !/^https?:\/\//i.test(purchaseUrl)) {
      return { ok: false, error: "Paid components need a purchase URL." };
    }
    const channels = ALL_CHANNELS.filter((channel) => data.distributionChannels?.includes(channel));
    if (channels.length === 0) return { ok: false, error: "Enable at least one distribution channel." };

    // Creator-run channels require the actual install command.
    const shadcnCommand = String(data.shadcnCommand ?? "").trim();
    const otherCliCommand = String(data.otherCliCommand ?? "").trim();
    if (channels.includes("shadcn") && !shadcnCommand) {
      return { ok: false, error: "Enter the shadcn install command." };
    }
    if (channels.includes("compatible-cli") && !otherCliCommand) {
      return { ok: false, error: "Enter the command for other CLIs." };
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
        : files.map((file) => ({ path: file.path.trim(), content: file.content, type: "registry:component" })),
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
        })
        .returning({ id: schema.components.id });
      componentId = created!.id;
    }

    // Versions are immutable.
    const [versionExists] = await db
      .select({ id: schema.componentVersions.id })
      .from(schema.componentVersions)
      .where(
        and(
          eq(schema.componentVersions.componentId, componentId),
          eq(schema.componentVersions.version, version),
        ),
      )
      .limit(1);
    if (versionExists) {
      return { ok: false, error: `Version ${version} already exists. Bump the version.` };
    }

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
          content: file.content,
          sizeBytes: new TextEncoder().encode(file.content).length,
          orderIndex: index,
        })),
      );
    }

    await db
      .update(schema.components)
      .set({ latestVersionId: createdVersion!.id, updatedAt: new Date() })
      .where(eq(schema.components.id, componentId));

    return { ok: true, namespace: user.username, name };
  });
