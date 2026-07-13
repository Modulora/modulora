/**
 * Serve a published component as a shadcn registry-item JSON so
 * `shadcn add https://modulora.dev/r/@user/name[@version]` resolves.
 *
 * Only approved, public, open-source components are served. Files are the
 * installable (component-role) files with the `src/` prefix stripped and a
 * shadcn file `type` inferred from the path; npm dependencies come from the
 * author's package.json.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq } from "drizzle-orm";
import { schema } from "@modulora/db";
import { getCurrentUser } from "./session";
import { hasCollectionEntitlement, hasEntitlement } from "./marketplace";
import { DIRECT_MARKETPLACE_ENABLED } from "./flags";

export interface ParsedRegistryPath {
  namespace: string;
  name: string;
  version: string | null;
}

/** Parse `@namespace/name` or `@namespace/name@version` (leading @ optional). */
export function parseRegistryPath(splat: string): ParsedRegistryPath | null {
  const clean = decodeURIComponent(splat).trim().replace(/^@/, "").replace(/\.json$/, "");
  const slash = clean.indexOf("/");
  if (slash < 1) return null;
  const namespace = clean.slice(0, slash).toLowerCase();
  let rest = clean.slice(slash + 1);
  let version: string | null = null;
  const at = rest.lastIndexOf("@");
  if (at > 0) {
    version = rest.slice(at + 1);
    rest = rest.slice(0, at);
  }
  const name = rest.toLowerCase();
  if (!namespace || !name) return null;
  return { namespace, name, version };
}

/** The canonical install path: the editor's `src/` prefix stripped. The content
 *  digest and `/r/` files are both computed over this form so the CLI can
 *  verify what it receives against the published digest. */
export function stripSrc(path: string): string {
  return path.trim().replace(/^src\//, "");
}

function fileType(path: string): string {
  if (/(^|\/)components\/ui\//.test(path)) return "registry:ui";
  if (/(^|\/)hooks?\//.test(path)) return "registry:hook";
  if (/(^|\/)lib\//.test(path)) return "registry:lib";
  return "registry:component";
}

interface RegistryItem {
  $schema: string;
  name: string;
  type: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  files: { path: string; content: string; type: string }[];
  // Non-standard: the published content digest, so the CLI can verify installs.
  // Collections add kind + per-member refs/digests (installed individually).
  meta?: {
    contentSha256: string | null;
    version: string;
    kind?: "collection";
    items?: { ref: string; version: string; contentSha256: string | null; paid?: boolean }[];
  };
}

/**
 * A collection resolves to a combined registry item (shadcn-compatible: all
 * member files + merged deps) plus meta.kind="collection" and per-member
 * refs/digests — the Modulora CLI installs members individually so every
 * component is digest-verified on its own. Only approved + public +
 * open-source members serve; anything else is silently absent by design.
 */
async function resolveCollection(
  db: ReturnType<typeof drizzle<typeof schema>>,
  parsed: ParsedRegistryPath,
  notFound: { status: "not-found" },
  request?: Request,
): Promise<RegistryResolution> {
  const [collection] = await db
    .select({ collection: schema.collections })
    .from(schema.collections)
    .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.collections.namespaceId))
    .where(and(eq(schema.namespaces.name, parsed.namespace), eq(schema.collections.name, parsed.name)))
    .limit(1);
  if (!collection) return notFound;

  // A priced collection is a product: the whole bundle requires the bundle
  // entitlement (buying it also snapshots per-member entitlements).
  const bundlePrice = DIRECT_MARKETPLACE_ENABLED
    ? (await db
        .select({ unitAmount: schema.collectionPrices.unitAmount, currency: schema.collectionPrices.currency })
        .from(schema.collectionPrices)
        .where(and(eq(schema.collectionPrices.collectionId, collection.collection.id), eq(schema.collectionPrices.active, true)))
        .limit(1))[0]
    : undefined;
  if (bundlePrice) {
    const bundleViewer = request ? await getCurrentUser(request) : null;
    const [bundleOwner] = await db
      .select({ ownerUserId: schema.namespaces.ownerUserId })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, parsed.namespace))
      .limit(1);
    const entitled = await hasCollectionEntitlement(collection.collection.id, bundleViewer?.id ?? null, bundleOwner?.ownerUserId ?? null);
    if (!entitled) {
      return { status: "payment-required", price: bundlePrice.unitAmount, currency: bundlePrice.currency };
    }
  }

  const members = await db
    .select({ component: schema.components, version: schema.componentVersions })
    .from(schema.collectionItems)
    .innerJoin(schema.components, eq(schema.components.id, schema.collectionItems.componentId))
    .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
    .where(eq(schema.collectionItems.collectionId, collection.collection.id))
    .orderBy(schema.collectionItems.orderIndex);

  const servable = members.filter(
    (m) =>
      m.component.visibility === "public" &&
      m.component.reviewStatus === "approved" &&
      m.component.sourceModel === "open-source" &&
      m.version,
  );
  if (servable.length === 0) return notFound;

  // Entitlement per priced member: files only for buyers/owner; everyone
  // still sees the member listed (paid: true) so the CLI can report it.
  const viewer = request ? await getCurrentUser(request) : null;
  const [owner] = await db
    .select({ ownerUserId: schema.namespaces.ownerUserId })
    .from(schema.namespaces)
    .where(eq(schema.namespaces.name, parsed.namespace))
    .limit(1);

  const files: { path: string; content: string; type: string }[] = [];
  const seenPaths = new Set<string>();
  const deps = new Set<string>();
  const items: { ref: string; version: string; contentSha256: string | null; paid?: boolean }[] = [];

  for (const member of servable) {
    const channels = member.component.distributionChannels ?? [];
    const price = DIRECT_MARKETPLACE_ENABLED
      ? (await db
          .select({ id: schema.componentPrices.id })
          .from(schema.componentPrices)
          .where(and(eq(schema.componentPrices.componentId, member.component.id), eq(schema.componentPrices.active, true)))
          .limit(1))[0]
      : undefined;
    const paid = Boolean(price);
    const entitled = !paid || (await hasEntitlement(member.component.id, viewer?.id ?? null, owner?.ownerUserId ?? null));
    if (!entitled) {
      items.push({
        ref: `@${parsed.namespace}/${member.component.name}`,
        version: member.version!.version,
        contentSha256: member.version!.contentSha256 ?? null,
        paid: true,
      });
      continue;
    }
    const memberFiles = await db
      .select({ path: schema.componentFiles.path, content: schema.componentFiles.content, role: schema.componentFiles.role })
      .from(schema.componentFiles)
      .where(eq(schema.componentFiles.componentVersionId, member.version!.id))
      .orderBy(schema.componentFiles.orderIndex);
    for (const file of memberFiles) {
      if (file.role !== "component") continue;
      // Channel opt-outs respected: shadcn-served files only for members
      // that enabled the shadcn channel.
      if (!channels.includes("shadcn")) continue;
      const path = stripSrc(file.path);
      if (seenPaths.has(path)) continue;
      seenPaths.add(path);
      files.push({ path, content: file.content ?? "", type: fileType(path) });
    }
    const pkg = memberFiles.find((f) => f.path === "package.json");
    if (pkg?.content) {
      try {
        const parsedPkg = JSON.parse(pkg.content) as { dependencies?: Record<string, string> };
        for (const dep of Object.keys(parsedPkg.dependencies ?? {})) {
          if (dep !== "react" && dep !== "react-dom") deps.add(dep);
        }
      } catch { /* ignore */ }
    }
    if (channels.includes("modulora-cli")) {
      items.push({
        ref: `@${parsed.namespace}/${member.component.name}`,
        version: member.version!.version,
        contentSha256: member.version!.contentSha256 ?? null,
        ...(paid ? { paid: true } : {}),
      });
    }
  }
  if (items.length === 0 && files.length === 0) return notFound;

  return {
    status: "ok",
    gated: items.some((item) => item.paid),
    item: {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: collection.collection.name,
      type: "registry:block",
      title: collection.collection.title,
      description: collection.collection.description,
      ...(deps.size ? { dependencies: [...deps] } : {}),
      files,
      meta: { contentSha256: null, version: "", kind: "collection", items },
    },
  };
}

export type RegistryResolution =
  | { status: "ok"; item: RegistryItem; gated: boolean }
  | { status: "payment-required"; price: number; currency: string }
  | { status: "not-found" };

export async function resolveRegistryItem(
  parsed: ParsedRegistryPath,
  request?: Request,
): Promise<RegistryResolution> {
  const notFound = { status: "not-found" } as const;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return notFound;
  const db = drizzle(neon(databaseUrl), { schema });

  const [row] = await db
    .select({ component: schema.components, version: schema.componentVersions, namespace: schema.namespaces.name, ownerUserId: schema.namespaces.ownerUserId })
    .from(schema.components)
    .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
    .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
    .where(and(eq(schema.namespaces.name, parsed.namespace), eq(schema.components.name, parsed.name)))
    .limit(1);

  if (!row) {
    // No component by that name — it may be a collection.
    return resolveCollection(db, parsed, notFound, request);
  }
  const c = row.component;
  // Only serve components that are public, approved, and open-source.
  // (external-commercial source is never hosted here.)
  if (c.visibility !== "public" || c.reviewStatus !== "approved" || c.sourceModel !== "open-source") {
    return notFound;
  }

  // Marketplace-priced components require an entitlement: the buyer (or the
  // owner), authenticated via session cookie or a CLI bearer token.
  const price = DIRECT_MARKETPLACE_ENABLED
    ? (await db
        .select({ unitAmount: schema.componentPrices.unitAmount, currency: schema.componentPrices.currency })
        .from(schema.componentPrices)
        .where(and(eq(schema.componentPrices.componentId, c.id), eq(schema.componentPrices.active, true)))
        .limit(1))[0]
    : undefined;
  if (price) {
    const viewer = request ? await getCurrentUser(request) : null;
    const entitled = await hasEntitlement(c.id, viewer?.id ?? null, row.ownerUserId ?? null);
    if (!entitled) {
      return { status: "payment-required", price: price.unitAmount, currency: price.currency };
    }
  }

  // Resolve the requested version (or the latest).
  let versionId = row.version?.id ?? null;
  if (parsed.version) {
    const [v] = await db
      .select({ id: schema.componentVersions.id })
      .from(schema.componentVersions)
      .where(and(eq(schema.componentVersions.componentId, c.id), eq(schema.componentVersions.version, parsed.version)))
      .limit(1);
    versionId = v?.id ?? null;
  }
  if (!versionId) return notFound;

  const files = await db
    .select({ path: schema.componentFiles.path, content: schema.componentFiles.content, role: schema.componentFiles.role })
    .from(schema.componentFiles)
    .where(eq(schema.componentFiles.componentVersionId, versionId))
    .orderBy(schema.componentFiles.orderIndex);

  const installFiles = files.filter((f) => f.role === "component");
  if (installFiles.length === 0) return notFound;

  // npm dependencies from the author's package.json (excluding react runtime).
  let dependencies: string[] = [];
  const pkg = files.find((f) => f.path === "package.json");
  if (pkg?.content) {
    try {
      const parsedPkg = JSON.parse(pkg.content) as { dependencies?: Record<string, string> };
      dependencies = Object.keys(parsedPkg.dependencies ?? {}).filter(
        (dep) => dep !== "react" && dep !== "react-dom",
      );
    } catch {
      dependencies = [];
    }
  }

  // Digest + version for verification, from the resolved version.
  const [version] = await db
    .select({ contentSha256: schema.componentVersions.contentSha256, version: schema.componentVersions.version })
    .from(schema.componentVersions)
    .where(eq(schema.componentVersions.id, versionId))
    .limit(1);

  return { status: "ok", gated: Boolean(price), item: {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: c.name,
    type: c.itemType || "registry:component",
    title: c.title,
    description: c.description,
    ...(dependencies.length ? { dependencies } : {}),
    files: installFiles.map((f) => {
      const path = stripSrc(f.path);
      return { path, content: f.content ?? "", type: fileType(path) };
    }),
    meta: { contentSha256: version?.contentSha256 ?? null, version: version?.version ?? "" },
  } };
}
