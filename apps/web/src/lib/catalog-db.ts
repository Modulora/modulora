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
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { schema } from "@modulora/db";
import { catalog as demoCatalog, findItem, type CatalogItem } from "../data/catalog";
import { categoryLabel, componentTypeLabel } from "./taxonomy";
import { getCurrentUser } from "./session";
import { normalizeDomain } from "./domains";
import { hasCollectionEntitlement, hasEntitlement } from "./marketplace";
import { DIRECT_MARKETPLACE_ENABLED } from "./flags";
import { licenseTemplate, resolveLicenseText } from "./license";
import { publicListsFor } from "./lists";
import {
  visibleProfileContent,
  visibleProfileItems,
  type ProfileSectionVisibility,
} from "./profile-sections";

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(neon(url), { schema });
}

function domainOf(url: string | null): string | undefined {
  return normalizeDomain(url ?? "") ?? undefined;
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
    componentType: componentTypeLabel(component.componentType) ?? undefined,
    distributionChannels: component.distributionChannels ?? undefined,
    creatorShadcnCommand: component.shadcnCommand ?? undefined,
    otherCliCommand: component.otherCliCommand ?? undefined,
    files: files.length ? files : undefined,
    live: true,
    evidence,
    moderationState: (component.moderationState as CatalogItem["moderationState"]) ?? null,
  };
}

async function loadEvidence(
  database: NonNullable<ReturnType<typeof db>>,
  versionId: string,
  options: { audience: "public" | "curator" } = { audience: "public" },
): Promise<CatalogItem["evidence"]> {
  const rows = await database
    .select()
    .from(schema.evidenceRecords)
    .where(eq(schema.evidenceRecords.componentVersionId, versionId))
    .orderBy(schema.evidenceRecords.recordedAt);
  // Similarity warnings are review-time signals, not public claims: on an
  // approved listing a stale "requires human review" warning would cast doubt
  // on a creator's work after the human review already resolved it. Curators
  // see every record; the public sees the clean-screen record only.
  const visible =
    options.audience === "curator"
      ? rows
      : rows.filter((row) => row.type !== "similarity-screen" || row.status === "passed");
  return visible.map((row) => ({
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
      .where(and(eq(schema.components.visibility, "public"), eq(schema.components.reviewStatus, "approved"), isNull(schema.components.moderationState)))
      .orderBy(desc(schema.components.createdAt));

    // Collection membership per component (first collection shown on cards).
    const memberships = await database
      .select({
        componentId: schema.collectionItems.componentId,
        title: schema.collections.title,
        collectionPrice: schema.collectionPrices.unitAmount,
        externalUrl: schema.collections.externalUrl,
      })
      .from(schema.collectionItems)
      .innerJoin(schema.collections, eq(schema.collections.id, schema.collectionItems.collectionId))
      .leftJoin(
        schema.collectionPrices,
        and(eq(schema.collectionPrices.collectionId, schema.collections.id), eq(schema.collectionPrices.active, true)),
      );
    const collectionByComponent = new Map<string, { title: string; paid: boolean }>();
    for (const m of memberships) {
      const current = collectionByComponent.get(m.componentId);
      collectionByComponent.set(m.componentId, {
        title: current?.title ?? m.title,
        paid: current?.paid === true || m.collectionPrice !== null || m.externalUrl !== null,
      });
    }

    const dbItems = rows.map((row) => {
      const membership = collectionByComponent.get(row.component.id);
      return {
        ...toCatalogItem(row.namespace, row.component, row.version),
        inCollection: membership?.title ?? null,
        inPaidCollection: membership?.paid ?? false,
      };
    });
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
          isNull(schema.components.moderationState),
        ),
      )
      .orderBy(desc(schema.promotions.startsAt))
      .limit(6);
    return Promise.all(
      rows.map(async (row) => {
        const paidCollections = await database
          .select({ id: schema.collections.id, price: schema.collectionPrices.unitAmount, externalUrl: schema.collections.externalUrl })
          .from(schema.collectionItems)
          .innerJoin(schema.collections, eq(schema.collections.id, schema.collectionItems.collectionId))
          .leftJoin(
            schema.collectionPrices,
            and(eq(schema.collectionPrices.collectionId, schema.collections.id), eq(schema.collectionPrices.active, true)),
          )
          .where(eq(schema.collectionItems.componentId, row.component.id))
          .limit(20);
        return {
          ...toCatalogItem(row.namespace, row.component, row.version),
          inPaidCollection: paidCollections.some((collection) => collection.price !== null || collection.externalUrl !== null),
        };
      }),
    );
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
    const price = DIRECT_MARKETPLACE_ENABLED
      ? (await database
          .select({
            unitAmount: schema.componentPrices.unitAmount,
            licenseTemplate: schema.componentPrices.licenseTemplate,
            licenseText: schema.componentPrices.licenseText,
          })
          .from(schema.componentPrices)
          .where(and(eq(schema.componentPrices.componentId, row.component.id), eq(schema.componentPrices.active, true)))
          .limit(1))[0]
      : undefined;
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
      .select({
        name: schema.collections.name,
        title: schema.collections.title,
        collectionPrice: schema.collectionPrices.unitAmount,
        externalUrl: schema.collections.externalUrl,
      })
      .from(schema.collectionItems)
      .innerJoin(schema.collections, eq(schema.collections.id, schema.collectionItems.collectionId))
      .leftJoin(
        schema.collectionPrices,
        and(eq(schema.collectionPrices.collectionId, schema.collections.id), eq(schema.collectionPrices.active, true)),
      )
      .where(eq(schema.collectionItems.componentId, row.component.id));

    return {
      ...item,
      marketplacePrice,
      marketplaceLicense,
      entitled,
      ownedPurchase,
      memberOf: memberOf.map(({ name, title }) => ({ name, title })),
      inPaidCollection: memberOf.some((membership) => membership.collectionPrice !== null || membership.externalUrl !== null),
    };
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
    const evidence = row.version ? await loadEvidence(database, row.version.id, { audience: "curator" }) : [];
    const paidCollections = await database
      .select({ id: schema.collections.id, price: schema.collectionPrices.unitAmount, externalUrl: schema.collections.externalUrl })
      .from(schema.collectionItems)
      .innerJoin(schema.collections, eq(schema.collections.id, schema.collectionItems.collectionId))
      .leftJoin(
        schema.collectionPrices,
        and(eq(schema.collectionPrices.collectionId, schema.collections.id), eq(schema.collectionPrices.active, true)),
      )
      .where(eq(schema.collectionItems.componentId, row.component.id))
      .limit(20);

    // Latest similarity screen for the curator comparison surface (#67).
    let similarityScreen: CatalogItem["similarityScreen"] = null;
    if (row.version) {
      const [screen] = await database
        .select()
        .from(schema.similarityScreens)
        .where(eq(schema.similarityScreens.componentVersionId, row.version.id))
        .orderBy(desc(schema.similarityScreens.createdAt))
        .limit(1);
      if (screen && screen.status !== "error") {
        const submittedContent = new Map(files.map((file) => [file.path, file.content ?? ""]));
        const storedCandidates = (screen.results as {
          candidates?: {
            componentVersionId: string;
            ref: string;
            confidence: string | null;
            matches?: { path: string; candidatePath: string; score: number; scaffolding: boolean }[];
          }[];
        })?.candidates ?? [];
        // Source is returned only by this curator-authorized server function.
        // Diffs render locally in the browser; no unpublished code is sent to
        // the rendering library or another service.
        const candidates = await Promise.all(
          storedCandidates.map(async (candidate) => {
            const matches = (candidate.matches ?? []).filter((match) => !match.scaffolding).slice(0, 6);
            const candidatePaths = [...new Set(matches.map((match) => match.candidatePath))];
            // Nothing rendered means nothing fetched — never pull a whole
            // release's files for a scaffolding-only candidate.
            const candidateFiles =
              candidatePaths.length > 0
                ? await database
                    .select({ path: schema.componentFiles.path, content: schema.componentFiles.content })
                    .from(schema.componentFiles)
                    .where(
                      and(
                        eq(schema.componentFiles.componentVersionId, candidate.componentVersionId),
                        inArray(schema.componentFiles.path, candidatePaths),
                      ),
                    )
                : [];
            const candidateContent = new Map(candidateFiles.map((file) => [file.path, file.content ?? ""]));
            return {
              ref: candidate.ref,
              confidence: candidate.confidence,
              files: matches.map((match) => ({
                  path: match.path,
                  candidatePath: match.candidatePath,
                  score: match.score,
                  submittedContent: submittedContent.get(match.path),
                  candidateContent: candidateContent.get(match.candidatePath),
                })),
            };
          }),
        );
        similarityScreen = {
          state:
            screen.resolution === "authorized-derivative"
              ? "authorized-derivative"
              : (screen.status as "clear" | "potential" | "blocked"),
          candidates,
          corpusLimitation: screen.corpusLimitation,
        };
      }
    }

    return {
      ...toCatalogItem(
        row.namespace,
        row.component,
        row.version,
        files.map((file) => ({ path: file.path, content: file.content ?? "" })),
        evidence,
      ),
      similarityScreen,
      inPaidCollection: paidCollections.some((collection) => collection.price !== null || collection.externalUrl !== null),
    };
  });

export interface PublicProfile {
  username: string;
  name: string;
  image: string | null;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  xUrl: string | null;
  /** Self-asserted sponsorship link — display-only, never a trust claim. */
  sponsorUrl: string | null;
  sections: ProfileSectionVisibility;
  githubUsername: string | null;
  xUsername: string | null;
  websiteVerified: boolean;
  isPlus: boolean;
  badges: string[];
  joinedAt: string;
}

/** Public profile + a creator's approved, public components. */
export const fetchPublicProfile = createServerFn({ method: "GET" })
  .validator((data: { username: string }) => ({ username: String(data.username ?? "").trim().toLowerCase() }))
  .handler(async ({ data }): Promise<{ profile: PublicProfile; components: CatalogItem[]; collections: PublicCollection[]; publicLists: import("./lists").PublicList[] } | null> => {
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
    const sections: ProfileSectionVisibility = {
      bio: user.showProfileBio,
      links: user.showProfileLinks,
      sponsor: user.showProfileSponsor,
      components: user.showProfileComponents,
      collections: user.showProfileCollections,
      publicLists: user.showProfilePublicLists,
    };

    const badges = await database
      .select({ badge: schema.userBadges.badge })
      .from(schema.userBadges)
      .where(eq(schema.userBadges.userId, user.id));

    // Website is "verified" only if its domain is a confirmed verified domain.
    let websiteVerified = false;
    const websiteDomain = sections.links && user.websiteUrl ? normalizeDomain(user.websiteUrl) : null;
    if (websiteDomain) {
      const [vd] = await database
        .select({ id: schema.verifiedDomains.id })
        .from(schema.verifiedDomains)
        .where(and(eq(schema.verifiedDomains.ownerUserId, user.id), eq(schema.verifiedDomains.domain, websiteDomain)))
        .limit(1);
      websiteVerified = Boolean(vd);
    }

    const rows = sections.components || sections.collections
      ? await database
          .select({ component: schema.components, version: schema.componentVersions, namespace: schema.namespaces.name })
          .from(schema.components)
          .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
          .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
          .where(and(eq(schema.components.namespaceId, ns.id), eq(schema.components.visibility, "public"), eq(schema.components.reviewStatus, "approved"), isNull(schema.components.moderationState)))
          .orderBy(desc(schema.components.createdAt))
      : [];

    // Collections: listed with their approved-member count, bundle price,
    // license, and whether the signed-in viewer already owns the bundle.
    const request = getRequest();
    const profileViewer = request ? await getCurrentUser(request) : null;
    const collectionRows = sections.collections
      ? await database
          .select()
          .from(schema.collections)
          .where(eq(schema.collections.namespaceId, ns.id))
          .orderBy(desc(schema.collections.updatedAt))
      : [];
    const collections: PublicCollection[] = [];
    const paidCollectionMemberNames = new Set<string>();
    for (const collection of collectionRows) {
      const members = await database
        .select({ name: schema.components.name, title: schema.components.title, reviewStatus: schema.components.reviewStatus, visibility: schema.components.visibility, distributionChannels: schema.components.distributionChannels })
        .from(schema.collectionItems)
        .innerJoin(schema.components, eq(schema.components.id, schema.collectionItems.componentId))
        .where(eq(schema.collectionItems.collectionId, collection.id));
      const live = members.filter((m) => m.reviewStatus === "approved" && m.visibility === "public");
      if (live.length === 0) continue;
      const [storedPrice] = await database
        .select({ unitAmount: schema.collectionPrices.unitAmount, licenseTemplate: schema.collectionPrices.licenseTemplate, licenseText: schema.collectionPrices.licenseText })
        .from(schema.collectionPrices)
        .where(and(eq(schema.collectionPrices.collectionId, collection.id), eq(schema.collectionPrices.active, true)))
        .limit(1);
      if (storedPrice || collection.externalUrl) live.forEach((member) => paidCollectionMemberNames.add(member.name));
      const price = DIRECT_MARKETPLACE_ENABLED ? storedPrice : undefined;
      const externalDomain = collection.externalUrl ? domainOf(collection.externalUrl) : null;
      const [verifiedExternalDomain] = externalDomain && ns.ownerUserId
        ? await database
            .select({ verifiedAt: schema.verifiedDomains.verifiedAt })
            .from(schema.verifiedDomains)
            .where(
              and(
                eq(schema.verifiedDomains.ownerUserId, ns.ownerUserId),
                eq(schema.verifiedDomains.domain, externalDomain),
              ),
            )
            .limit(1)
        : [];
      const coverRow = rows.find((row) => live.some((member) => member.name === row.component.name));
      const cover = coverRow
        ? {
            ...toCatalogItem(coverRow.namespace, coverRow.component, coverRow.version),
            inPaidCollection: Boolean(storedPrice || collection.externalUrl),
          }
        : null;
      collections.push({
        name: collection.name,
        title: collection.title,
        description: collection.description,
        external: collection.externalUrl
          ? {
              url: collection.externalUrl,
              domain: externalDomain ?? "",
              verifiedAt: verifiedExternalDomain?.verifiedAt?.toISOString() ?? null,
            }
          : null,
        members: live.map((m) => ({ name: m.name, title: m.title })),
        cover,
        cliInstallable: live.some((m) => (m.distributionChannels ?? []).includes("modulora-cli")),
        price: price?.unitAmount ?? null,
        license: price ? { name: licenseTemplate(price.licenseTemplate).name, text: resolveLicenseText(price.licenseTemplate, price.licenseText) } : null,
        owned: price ? await hasCollectionEntitlement(collection.id, profileViewer?.id ?? null, ns.ownerUserId) : false,
      });
    }

    const visibleContent = visibleProfileContent(
      {
        bio: user.bio,
        websiteUrl: user.websiteUrl,
        githubUrl: user.githubUrl,
        xUrl: user.xUrl,
        sponsorUrl: user.sponsorUrl,
        githubUsername: user.githubUsername,
        xUsername: user.xUsername,
      },
      sections,
    );
    const componentItems = rows.map((row) => ({
      ...toCatalogItem(row.namespace, row.component, row.version),
      inPaidCollection: paidCollectionMemberNames.has(row.component.name),
    }));

    return {
      profile: {
        username: user.username ?? data.username,
        name: user.name,
        image: user.image,
        ...visibleContent,
        sections,
        websiteVerified,
        isPlus: user.isPlus,
        badges: badges.map((row) => row.badge),
        joinedAt: user.createdAt.toISOString(),
      },
      components: visibleProfileItems(sections.components, componentItems),
      collections,
      publicLists: sections.publicLists ? await publicListsFor(ns.ownerUserId) : [],
    };
  });

export interface PublicCollection {
  name: string;
  title: string;
  description: string;
  members: { name: string; title: string }[];
  cover: CatalogItem | null;
  cliInstallable: boolean;
  price: number | null;
  /** Sold on the creator's own site — mutually exclusive with price. */
  external: { url: string; domain: string; verifiedAt: string | null } | null;
  license: { name: string; text: string } | null;
  owned: boolean;
}

export interface CreatorReviewRecord {
  id: string;
  version: string | null;
  standardVersion: string;
  decision: "approve" | "request-changes" | "reject" | "escalate";
  checklist: Record<string, string>;
  rationale: string;
  limitations: string;
  createdAt: string;
}

export interface MyComponent {
  name: string;
  title: string;
  category: string;
  version: string;
  sourceModel: string;
  reviewStatus: "draft" | "pending" | "approved" | "rejected";
  reviewReason: string | null;
  marketplacePrice: number | null;
  updatedAt: string;
  reviewHistory: CreatorReviewRecord[];
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

    const componentIds = rows.map((row) => row.component.id);
    const records = componentIds.length > 0
      ? await database
          .select({
            id: schema.reviewRecords.id,
            componentId: schema.reviewRecords.componentId,
            version: schema.componentVersions.version,
            standardVersion: schema.reviewRecords.standardVersion,
            decision: schema.reviewRecords.decision,
            checklist: schema.reviewRecords.checklist,
            rationale: schema.reviewRecords.rationale,
            limitations: schema.reviewRecords.limitations,
            createdAt: schema.reviewRecords.createdAt,
          })
          .from(schema.reviewRecords)
          .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.reviewRecords.componentVersionId))
          .where(inArray(schema.reviewRecords.componentId, componentIds))
          .orderBy(desc(schema.reviewRecords.createdAt))
      : [];

    return rows.map((row) => ({
      name: row.component.name,
      title: row.component.title,
      category: categoryLabel(row.component.category),
      version: row.version?.version ?? "0.0.0",
      sourceModel: row.component.sourceModel,
      reviewStatus: row.component.reviewStatus,
      reviewReason: row.component.reviewReason,
      marketplacePrice: DIRECT_MARKETPLACE_ENABLED ? row.price ?? null : null,
      updatedAt: row.component.updatedAt.toISOString(),
      reviewHistory: records
        .filter((record) => record.componentId === row.component.id)
        .map((record) => ({
          id: record.id,
          version: record.version,
          standardVersion: record.standardVersion,
          decision: record.decision,
          checklist: record.checklist,
          rationale: record.rationale,
          limitations: record.limitations,
          createdAt: record.createdAt.toISOString(),
        })),
    }));
  },
);

export interface EditableComponent {
  name: string;
  title: string;
  description: string;
  category: string;
  componentType?: string;
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
      componentType: row.component.componentType ?? undefined,
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

/** A collection's public detail view: members with files for live previews
 *  (paid members' files only when the viewer is entitled — locked otherwise). */
export interface CollectionDetail {
  namespace: string;
  name: string;
  title: string;
  description: string;
  price: number | null;
  /** Sold on the creator's own site — mutually exclusive with price. */
  external: { url: string; domain: string; verifiedAt: string | null } | null;
  license: { name: string; text: string } | null;
  owned: boolean;
  members: (CatalogItem & { locked: boolean })[];
}

export const fetchCollectionDetail = createServerFn({ method: "GET" })
  .validator((data: { namespace: string; name: string }) => ({
    namespace: String(data.namespace ?? "").trim().toLowerCase(),
    name: String(data.name ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<CollectionDetail | null> => {
    const database = db();
    if (!database) return null;

    const [row] = await database
      .select({ collection: schema.collections, ownerUserId: schema.namespaces.ownerUserId })
      .from(schema.collections)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.collections.namespaceId))
      .where(and(eq(schema.namespaces.name, data.namespace), eq(schema.collections.name, data.name)))
      .limit(1);
    if (!row) return null;

    const request = getRequest();
    const viewer = request ? await getCurrentUser(request) : null;

    const price = DIRECT_MARKETPLACE_ENABLED
      ? (await database
          .select({ unitAmount: schema.collectionPrices.unitAmount, licenseTemplate: schema.collectionPrices.licenseTemplate, licenseText: schema.collectionPrices.licenseText })
          .from(schema.collectionPrices)
          .where(and(eq(schema.collectionPrices.collectionId, row.collection.id), eq(schema.collectionPrices.active, true)))
          .limit(1))[0]
      : undefined;
    const owned = price
      ? await hasCollectionEntitlement(row.collection.id, viewer?.id ?? null, row.ownerUserId)
      : false;
    const externalDomain = row.collection.externalUrl ? domainOf(row.collection.externalUrl) : null;
    const [verifiedExternalDomain] = externalDomain && row.ownerUserId
      ? await database
          .select({ verifiedAt: schema.verifiedDomains.verifiedAt })
          .from(schema.verifiedDomains)
          .where(
            and(
              eq(schema.verifiedDomains.ownerUserId, row.ownerUserId),
              eq(schema.verifiedDomains.domain, externalDomain),
            ),
          )
          .limit(1)
      : [];

    const memberRows = await database
      .select({ component: schema.components, version: schema.componentVersions })
      .from(schema.collectionItems)
      .innerJoin(schema.components, eq(schema.components.id, schema.collectionItems.componentId))
      .leftJoin(schema.componentVersions, eq(schema.componentVersions.id, schema.components.latestVersionId))
      .where(eq(schema.collectionItems.collectionId, row.collection.id))
      .orderBy(asc(schema.collectionItems.orderIndex));

    const members: (CatalogItem & { locked: boolean })[] = [];
    for (const member of memberRows) {
      if (member.component.visibility !== "public" || member.component.reviewStatus !== "approved" || !member.version) continue;
      const memberPrice = DIRECT_MARKETPLACE_ENABLED
        ? (await database
            .select({ id: schema.componentPrices.id })
            .from(schema.componentPrices)
            .where(and(eq(schema.componentPrices.componentId, member.component.id), eq(schema.componentPrices.active, true)))
            .limit(1))[0]
        : undefined;
      const entitled = !memberPrice
        ? true
        : owned || (await hasEntitlement(member.component.id, viewer?.id ?? null, row.ownerUserId));
      const files = entitled
        ? await database
            .select({ path: schema.componentFiles.path, content: schema.componentFiles.content })
            .from(schema.componentFiles)
            .where(eq(schema.componentFiles.componentVersionId, member.version.id))
            .orderBy(schema.componentFiles.orderIndex)
        : [];
      members.push({
        ...toCatalogItem(data.namespace, member.component, member.version, files.map((f) => ({ path: f.path, content: f.content ?? "" }))),
        locked: !entitled,
      });
    }
    if (members.length === 0) return null;

    return {
      namespace: data.namespace,
      name: row.collection.name,
      title: row.collection.title,
      description: row.collection.description,
      price: price?.unitAmount ?? null,
      external: row.collection.externalUrl
        ? {
            url: row.collection.externalUrl,
            domain: externalDomain ?? "",
            verifiedAt: verifiedExternalDomain?.verifiedAt?.toISOString() ?? null,
          }
        : null,
      license: price ? { name: licenseTemplate(price.licenseTemplate).name, text: resolveLicenseText(price.licenseTemplate, price.licenseText) } : null,
      owned,
      members,
    };
  });
