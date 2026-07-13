/**
 * Database-backed catalog. Maps stored components/versions/files onto the
 * CatalogItem shape the UI already consumes, and merges the static demo seed so
 * browse is never empty. Read paths are public; management paths are
 * owner-scoped.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, gt } from "drizzle-orm";
import { schema } from "@modulora/db";
import { catalog as demoCatalog, findItem, type CatalogItem } from "../data/catalog";
import { categoryLabel } from "./taxonomy";
import { getCurrentUser } from "./session";
import { normalizeDomain } from "./domains";
import { hasCollectionEntitlement, hasEntitlement } from "./marketplace";
import { licenseTemplate, resolveLicenseText } from "./license";

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(neon(url), { schema });
}

function domainOf(url: string | null): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

type ComponentRow = typeof schema.components.$inferSelect;
type VersionRow = typeof schema.componentVersions.$inferSelect;

function toCatalogItem(
  namespace: string,
  component: ComponentRow,
  version: VersionRow | null,
  files: CatalogItem["files"] = [],
  evidence: CatalogItem["evidence"] = [],
): CatalogItem {
  const isPaid = component.sourceModel !== "open-source";
  return {
    schemaVersion: "0",
    namespace,
    name: component.name,
    version: version?.version ?? "0.0.0",
    framework: "react",
    sourceModel: component.sourceModel as CatalogItem["sourceModel"],
    visibility: component.visibility as CatalogItem["visibility"],
    owner: { kind: "user", identifier: namespace },
    source: component.originalUrl
      ? { repository: component.originalUrl, commit: "" }
      : undefined,
    license:
      version?.licenseKind === "spdx"
        ? { kind: "spdx", spdxExpression: version.spdxExpression ?? "MIT" }
        : { kind: "commercial", url: component.purchaseUrl ?? undefined },
    purchase:
      isPaid && component.purchaseUrl
        ? { url: component.purchaseUrl, domain: domainOf(component.purchaseUrl) ?? "" }
        : undefined,
    title: component.title,
    description: component.description,
    category: categoryLabel(component.category),
    distributionChannels: component.distributionChannels ?? undefined,
    files: files.length ? files : undefined,
    evidence,
  };
}

async function loadEvidence(
  database: NonNullable<ReturnType<typeof db>>,
  versionId: string,
): Promise<CatalogItem["evidence"]> {
  const rows = await database
    .select()
    .from(schema.evidenceRecords)
    .where(eq(schema.evidenceRecords.componentVersionId, versionId))
    .orderBy(schema.evidenceRecords.recordedAt);
  return rows.map((row) => ({
    type: row.type as CatalogItem["evidence"][number]["type"],
    status: row.status as CatalogItem["evidence"][number]["status"],
    issuer: row.issuer,
    timestamp: row.recordedAt.toISOString(),
    scope: row.scope ?? undefined,
    toolVersion: row.toolVersion ?? undefined,
    limitations: row.limitations ?? undefined,
  }));
}

export const fetchCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogItem[]> => {
    const database = db();
    if (!database) return demoCatalog;

    const rows = await database
      .select({ component: schema.components, version: schema.componentVersions, namespace: schema.namespaces.name })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
      .where(and(eq(schema.components.visibility, "public"), eq(schema.components.reviewStatus, "approved")))
      .orderBy(desc(schema.components.createdAt));

    // Collection membership per component (first collection shown on cards).
    const memberships = await database
      .select({ componentId: schema.collectionItems.componentId, title: schema.collections.title })
      .from(schema.collectionItems)
      .innerJoin(schema.collections, eq(schema.collections.id, schema.collectionItems.collectionId));
    const collectionByComponent = new Map<string, string>();
    for (const m of memberships) {
      if (!collectionByComponent.has(m.componentId)) collectionByComponent.set(m.componentId, m.title);
    }

    const dbItems = rows.map((row) => ({
      ...toCatalogItem(row.namespace, row.component, row.version),
      inCollection: collectionByComponent.get(row.component.id) ?? null,
    }));
    return [...dbItems, ...demoCatalog];
  },
);

/** Components with an active paid promotion (clearly labeled on browse). */
export const fetchFeatured = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogItem[]> => {
    const database = db();
    if (!database) return [];
    const now = new Date();
    const rows = await database
      .select({ component: schema.components, version: schema.componentVersions, namespace: schema.namespaces.name })
      .from(schema.promotions)
      .innerJoin(schema.components, eq(schema.components.id, schema.promotions.componentId))
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
      .where(
        and(
          eq(schema.promotions.status, "active"),
          gt(schema.promotions.endsAt, now),
          eq(schema.components.visibility, "public"),
          eq(schema.components.reviewStatus, "approved"),
        ),
      )
      .orderBy(desc(schema.promotions.startsAt))
      .limit(6);
    return rows.map((row) => toCatalogItem(row.namespace, row.component, row.version));
  },
);

export const fetchCatalogDetail = createServerFn({ method: "GET" })
  .validator((data: { namespace: string; name: string }) => ({
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<CatalogItem | null> => {
    const demo = findItem(data.namespace, data.name);
    if (demo) return demo;

    const database = db();
    if (!database) return null;

    const [row] = await database
      .select({ component: schema.components, version: schema.componentVersions, namespace: schema.namespaces.name, ownerUserId: schema.namespaces.ownerUserId })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
      .where(and(eq(schema.namespaces.name, data.namespace), eq(schema.components.name, data.name)))
      .limit(1);
    if (!row) return null;

    const request = getRequest();
    const viewer = request ? await getCurrentUser(request) : null;

    // Un-approved components are visible only to their owner or a curator.
    if (row.component.reviewStatus !== "approved") {
      const isOwner = viewer?.username && viewer.username === row.namespace;
      if (!isOwner && !viewer?.isCurator) return null;
    }

    // Marketplace pricing: an active price gates the source behind purchase.
    const [price] = await database
      .select({
        unitAmount: schema.componentPrices.unitAmount,
        licenseTemplate: schema.componentPrices.licenseTemplate,
        licenseText: schema.componentPrices.licenseText,
      })
      .from(schema.componentPrices)
      .where(and(eq(schema.componentPrices.componentId, row.component.id), eq(schema.componentPrices.active, true)))
      .limit(1);
    const marketplacePrice = price?.unitAmount ?? null;
    const marketplaceLicense = price
      ? {
          name: licenseTemplate(price.licenseTemplate).name,
          text: resolveLicenseText(price.licenseTemplate, price.licenseText),
        }
      : null;

    // The viewer's own purchase (buyer side): powers the "You own this" tray.
    let ownedPurchase: import("./purchases").OwnedComponent | null = null;
    if (marketplacePrice !== null && viewer) {
      const [p] = await database
        .select({
          id: schema.purchases.id,
          amount: schema.purchases.amount,
          createdAt: schema.purchases.createdAt,
          licenseTemplate: schema.purchases.licenseTemplate,
          licenseText: schema.purchases.licenseTextSnapshot,
          licenseAcceptedAt: schema.purchases.licenseAcceptedAt,
        })
        .from(schema.purchases)
        .where(and(eq(schema.purchases.componentId, row.component.id), eq(schema.purchases.buyerUserId, viewer.id), eq(schema.purchases.status, "paid")))
        .limit(1);
      if (p) {
        ownedPurchase = {
          id: p.id,
          namespace: row.namespace,
          name: row.component.name,
          title: row.component.title,
          description: row.component.description,
          amount: p.amount,
          purchasedAt: p.createdAt.toISOString(),
          licenseTemplate: p.licenseTemplate,
          licenseText: p.licenseText,
          licenseAcceptedAt: p.licenseAcceptedAt?.toISOString() ?? null,
        };
      }
    }
    const entitled =
      marketplacePrice === null
        ? true
        : await hasEntitlement(row.component.id, viewer?.id ?? null, row.ownerUserId ?? null);

    const files = row.version
      ? await database
          .select({ path: schema.componentFiles.path, content: schema.componentFiles.content })
          .from(schema.componentFiles)
          .where(eq(schema.componentFiles.componentVersionId, row.version.id))
          .orderBy(schema.componentFiles.orderIndex)
      : [];
    const evidence = row.version ? await loadEvidence(database, row.version.id) : [];

    const item = toCatalogItem(
      row.namespace,
      row.component,
      row.version,
      // Never send paid source to a viewer who hasn't purchased it.
      entitled ? files.map((file) => ({ path: file.path, content: file.content ?? "" })) : [],
      evidence,
    );
    // Record the view: approved + public only, never the owner's own visits.
    // Analytics-only — views never affect earnings.
    if (row.component.reviewStatus === "approved" && row.component.visibility === "public" && viewer?.id !== row.ownerUserId) {
      try {
        await database.insert(schema.componentViews).values({
          componentId: row.component.id,
          viewerUserId: viewer?.id ?? null,
        });
      } catch {
        // A failed view write must never break the page.
      }
    }

    // Collection membership: "by maker · in <collection>".
    const memberOf = await database
      .select({ name: schema.collections.name, title: schema.collections.title })
      .from(schema.collectionItems)
      .innerJoin(schema.collections, eq(schema.collections.id, schema.collectionItems.collectionId))
      .where(eq(schema.collectionItems.componentId, row.component.id));

    return { ...item, marketplacePrice, marketplaceLicense, entitled, ownedPurchase, memberOf };
  });

/** Curator-only: load a component's full detail by id, regardless of status. */
export const fetchComponentForReview = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => ({ id: String(data.id ?? "").trim() }))
  .handler(async ({ data }): Promise<CatalogItem | null> => {
    const request = getRequest();
    const viewer = request ? await getCurrentUser(request) : null;
    if (!viewer?.isCurator) return null;
    const database = db();
    if (!database || !data.id) return null;

    const [row] = await database
      .select({ component: schema.components, version: schema.componentVersions, namespace: schema.namespaces.name })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
      .where(eq(schema.components.id, data.id))
      .limit(1);
    if (!row) return null;

    const files = row.version
      ? await database
          .select({ path: schema.componentFiles.path, content: schema.componentFiles.content })
          .from(schema.componentFiles)
          .where(eq(schema.componentFiles.componentVersionId, row.version.id))
          .orderBy(schema.componentFiles.orderIndex)
      : [];
    const evidence = row.version ? await loadEvidence(database, row.version.id) : [];

    return toCatalogItem(
      row.namespace,
      row.component,
      row.version,
      files.map((file) => ({ path: file.path, content: file.content ?? "" })),
      evidence,
    );
  });

export interface PublicProfile {
  username: string;
  name: string;
  image: string | null;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  xUrl: string | null;
  githubUsername: string | null;
  xUsername: string | null;
  websiteVerified: boolean;
  joinedAt: string;
}

/** Public profile + a creator's approved, public components. */
export const fetchPublicProfile = createServerFn({ method: "GET" })
  .validator((data: { username: string }) => ({ username: String(data.username ?? "").trim().toLowerCase() }))
  .handler(async ({ data }): Promise<{ profile: PublicProfile; components: CatalogItem[]; collections: PublicCollection[] } | null> => {
    const database = db();
    if (!database || !data.username) return null;

    const [ns] = await database
      .select({ id: schema.namespaces.id, ownerUserId: schema.namespaces.ownerUserId })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, data.username))
      .limit(1);
    if (!ns?.ownerUserId) return null;

    const [user] = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, ns.ownerUserId))
      .limit(1);
    if (!user) return null;

    // Website is "verified" only if its domain is a confirmed verified domain.
    let websiteVerified = false;
    const websiteDomain = user.websiteUrl ? normalizeDomain(user.websiteUrl) : null;
    if (websiteDomain) {
      const [vd] = await database
        .select({ id: schema.verifiedDomains.id })
        .from(schema.verifiedDomains)
        .where(and(eq(schema.verifiedDomains.ownerUserId, user.id), eq(schema.verifiedDomains.domain, websiteDomain)))
        .limit(1);
      websiteVerified = Boolean(vd);
    }

    const rows = await database
      .select({ component: schema.components, version: schema.componentVersions, namespace: schema.namespaces.name })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.components.visibility, "public"), eq(schema.components.reviewStatus, "approved")))
      .orderBy(desc(schema.components.createdAt));

    // Collections: listed with their approved-member count, bundle price,
    // license, and whether the signed-in viewer already owns the bundle.
    const request = getRequest();
    const profileViewer = request ? await getCurrentUser(request) : null;
    const collectionRows = await database
      .select()
      .from(schema.collections)
      .where(eq(schema.collections.namespaceId, ns.id))
      .orderBy(desc(schema.collections.updatedAt));
    const collections: PublicCollection[] = [];
    for (const collection of collectionRows) {
      const members = await database
        .select({ title: schema.components.title, reviewStatus: schema.components.reviewStatus, visibility: schema.components.visibility })
        .from(schema.collectionItems)
        .innerJoin(schema.components, eq(schema.components.id, schema.collectionItems.componentId))
        .where(eq(schema.collectionItems.collectionId, collection.id));
      const live = members.filter((m) => m.reviewStatus === "approved" && m.visibility === "public");
      if (live.length === 0) continue;
      const [price] = await database
        .select({ unitAmount: schema.collectionPrices.unitAmount, licenseTemplate: schema.collectionPrices.licenseTemplate, licenseText: schema.collectionPrices.licenseText })
        .from(schema.collectionPrices)
        .where(and(eq(schema.collectionPrices.collectionId, collection.id), eq(schema.collectionPrices.active, true)))
        .limit(1);
      collections.push({
        name: collection.name,
        title: collection.title,
        description: collection.description,
        memberTitles: live.map((m) => m.title),
        price: price?.unitAmount ?? null,
        license: price ? { name: licenseTemplate(price.licenseTemplate).name, text: resolveLicenseText(price.licenseTemplate, price.licenseText) } : null,
        owned: price ? await hasCollectionEntitlement(collection.id, profileViewer?.id ?? null, ns.ownerUserId) : false,
      });
    }

    return {
      profile: {
        username: user.username ?? data.username,
        name: user.name,
        image: user.image,
        bio: user.bio,
        websiteUrl: user.websiteUrl,
        githubUrl: user.githubUrl,
        xUrl: user.xUrl,
        githubUsername: user.githubUsername,
        xUsername: user.xUsername,
        websiteVerified,
        joinedAt: user.createdAt.toISOString(),
      },
      components: rows.map((row) => toCatalogItem(row.namespace, row.component, row.version)),
      collections,
    };
  });

export interface PublicCollection {
  name: string;
  title: string;
  description: string;
  memberTitles: string[];
  price: number | null;
  license: { name: string; text: string } | null;
  owned: boolean;
}

export interface MyComponent {
  name: string;
  title: string;
  category: string;
  version: string;
  sourceModel: string;
  reviewStatus: "pending" | "approved" | "rejected";
  reviewReason: string | null;
  marketplacePrice: number | null;
  updatedAt: string;
}

export const fetchMyComponents = createServerFn({ method: "GET" }).handler(
  async (): Promise<MyComponent[]> => {
    const request = getRequest();
    if (!request) return [];
    const user = await getCurrentUser(request);
    const database = db();
    if (!user?.username || !database) return [];

    const [ns] = await database
      .select({ id: schema.namespaces.id })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, user.username))
      .limit(1);
    if (!ns) return [];

    const rows = await database
      .select({ component: schema.components, version: schema.componentVersions, price: schema.componentPrices.unitAmount })
      .from(schema.components)
      .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
      .leftJoin(schema.componentPrices, and(eq(schema.componentPrices.componentId, schema.components.id), eq(schema.componentPrices.active, true)))
      .where(eq(schema.components.namespaceId, ns.id))
      .orderBy(desc(schema.components.updatedAt));

    return rows.map((row) => ({
      name: row.component.name,
      title: row.component.title,
      category: categoryLabel(row.component.category),
      version: row.version?.version ?? "0.0.0",
      sourceModel: row.component.sourceModel,
      reviewStatus: row.component.reviewStatus,
      reviewReason: row.component.reviewReason,
      marketplacePrice: row.price ?? null,
      updatedAt: row.component.updatedAt.toISOString(),
    }));
  },
);

export interface EditableComponent {
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
  files: { path: string; content: string }[];
}

export const fetchComponentForEdit = createServerFn({ method: "GET" })
  .validator((data: { name: string }) => ({ name: String(data.name ?? "").trim().toLowerCase() }))
  .handler(async ({ data }): Promise<EditableComponent | null> => {
    const request = getRequest();
    if (!request) return null;
    const user = await getCurrentUser(request);
    const database = db();
    if (!user?.username || !database) return null;

    const [row] = await database
      .select({ component: schema.components, version: schema.componentVersions })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
      .where(and(eq(schema.namespaces.name, user.username), eq(schema.components.name, data.name)))
      .limit(1);
    if (!row) return null;

    const files = row.version
      ? await database
          .select({ path: schema.componentFiles.path, content: schema.componentFiles.content })
          .from(schema.componentFiles)
          .where(eq(schema.componentFiles.componentVersionId, row.version.id))
          .orderBy(schema.componentFiles.orderIndex)
      : [];

    const isPaid = row.component.sourceModel !== "open-source";
    return {
      name: row.component.name,
      title: row.component.title,
      description: row.component.description,
      category: row.component.category,
      version: row.version?.version ?? "0.1.0",
      pricing: isPaid ? "paid" : "free",
      purchaseUrl: row.component.purchaseUrl ?? "",
      distributionChannels: row.component.distributionChannels ?? [],
      shadcnCommand: row.component.shadcnCommand ?? "",
      otherCliCommand: row.component.otherCliCommand ?? "",
      originalUrl: row.component.originalUrl ?? "",
      inspiredBy: row.component.inspiredBy ?? [],
      files: files.map((file) => ({ path: file.path, content: file.content ?? "" })),
    };
  });

export const deleteMyComponent = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => ({ name: String(data.name ?? "").trim().toLowerCase() }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const request = getRequest();
    if (!request) return { ok: false, error: "No request context." };
    const user = await getCurrentUser(request);
    const database = db();
    if (!user?.username || !database) return { ok: false, error: "You must be signed in." };

    const [ns] = await database
      .select({ id: schema.namespaces.id })
      .from(schema.namespaces)
      .where(eq(schema.namespaces.name, user.username))
      .limit(1);
    if (!ns) return { ok: false, error: "Namespace missing." };

    await database
      .delete(schema.components)
      .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.components.name, data.name)));
    return { ok: true };
  });
