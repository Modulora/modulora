import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { neon } from "@neondatabase/serverless";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { schema } from "@modulora/db";

import { normalizeDomain } from "./domains";
import { getMediaBucket } from "./media";
import { getCurrentUser } from "./session";
import { fireReviewWebhook } from "./review";
import { fetchToolMetadata } from "./tool-metadata";
import { isCategoryId } from "./taxonomy";
import { isToolPricing, normalizeToolShowcaseImages, type ToolPricing } from "./tool-showcase";
import { decideToolReviewCore, type ToolReviewDecisionInput } from "./tool-review";

function database() {
  const url = process.env.DATABASE_URL;
  return url ? drizzle(neon(url), { schema }) : null;
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

function nextPatch(version: string | null): string {
  const match = version?.match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? `${match[1]}.${match[2]}.${Number(match[3]) + 1}` : "1.0.0";
}

function normalizeSiteUrl(value: string): URL | null {
  try {
    const parsed = new URL(value.includes("://") ? value : `https://${value}`);
    return parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

async function verifiedDomainForUser(db: NonNullable<ReturnType<typeof database>>, userId: string, siteUrl: string) {
  const parsed = normalizeSiteUrl(siteUrl);
  if (!parsed) return null;
  const domain = normalizeDomain(parsed.hostname);
  if (!domain) return null;
  const [verified] = await db
    .select({ domain: schema.verifiedDomains.domain })
    .from(schema.verifiedDomains)
    .where(and(eq(schema.verifiedDomains.ownerUserId, userId), eq(schema.verifiedDomains.domain, domain), sql`${schema.verifiedDomains.verifiedAt} is not null`))
    .limit(1);
  return verified?.domain ?? null;
}

export interface ToolListingInput {
  name: string;
  title: string;
  description: string;
  category: string;
  siteUrl: string;
  showcaseImageUrls: string[];
  pricing: ToolPricing;
}

export interface EditableToolListing extends ToolListingInput {
  preview: {
    canonicalUrl: string;
    title: string;
    description: string;
    imageUrl: string | null;
  };
  editStatus: "pending" | "changes-requested" | "rejected" | null;
  reviewReason: string | null;
}

export const previewToolListing = createServerFn({ method: "POST" })
  .validator((data: { siteUrl: string }) => ({ siteUrl: String(data.siteUrl ?? "").trim() }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = database();
    if (!user || !db) return { ok: false as const, error: "Sign in first." };
    const parsed = normalizeSiteUrl(data.siteUrl);
    if (!parsed) return { ok: false as const, error: "Enter a valid HTTPS site URL." };
    const requestedDomain = normalizeDomain(parsed.hostname);
    if (!requestedDomain) return { ok: false as const, error: "Enter a valid HTTPS site URL." };
    const domain = await verifiedDomainForUser(db, user.id, parsed.toString());
    if (!domain) return { ok: false as const, error: "Verify this domain before previewing it.", verificationDomain: requestedDomain };
    try {
      const metadata = await fetchToolMetadata(parsed.toString(), domain, user.id, { mirrorImage: false });
      return { ok: true as const, domain, metadata };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Could not inspect the site." };
    }
  });

export const submitToolListing = createServerFn({ method: "POST" })
  .validator((data: ToolListingInput) => ({
    name: slug(String(data.name ?? "")),
    title: String(data.title ?? "").trim(),
    description: String(data.description ?? "").trim(),
    category: String(data.category ?? "").trim(),
    siteUrl: String(data.siteUrl ?? "").trim(),
    showcaseImageUrls: Array.isArray(data.showcaseImageUrls) ? data.showcaseImageUrls.map(String) : [],
    pricing: String(data.pricing ?? "free") as ToolListingInput["pricing"],
  }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = database();
    if (!user?.username || !db) return { ok: false as const, error: "Sign in with a creator profile first." };
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(data.name)) return { ok: false as const, error: "Use a 2–64 character lowercase listing slug." };
    if (data.title.length < 2 || data.title.length > 120) return { ok: false as const, error: "Title must be 2–120 characters." };
    if (data.description.length < 24 || data.description.length > 500) return { ok: false as const, error: "Description must be 24–500 characters." };
    if (!isCategoryId(data.category)) return { ok: false as const, error: "Choose a supported category." };
    const showcaseImageUrls = normalizeToolShowcaseImages(data.showcaseImageUrls, user.id);
    if (!showcaseImageUrls) return { ok: false as const, error: "Upload 1–6 showcase images before submitting." };
    const media = getMediaBucket();
    if (!media) return { ok: false as const, error: "Media storage is not configured." };
    const storedImages = await Promise.all(showcaseImageUrls.map((url) => media.head(url.slice("/i/".length))));
    if (storedImages.some((image) => !image)) return { ok: false as const, error: "One or more showcase images are no longer available. Upload them again." };
    if (!isToolPricing(data.pricing)) return { ok: false as const, error: "Choose Free, Freemium, or Paid pricing." };
    const parsed = normalizeSiteUrl(data.siteUrl);
    if (!parsed) return { ok: false as const, error: "Enter a valid HTTPS site URL." };
    const domain = await verifiedDomainForUser(db, user.id, parsed.toString());
    if (!domain) return { ok: false as const, error: "Verify this exact domain in Settings before submitting it." };

    let metadata;
    try { metadata = await fetchToolMetadata(parsed.toString(), domain, user.id); }
    catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Could not inspect the site." }; }

    const [namespace] = await db.select({ id: schema.namespaces.id }).from(schema.namespaces).where(eq(schema.namespaces.name, user.username)).limit(1);
    if (!namespace) return { ok: false as const, error: "Your namespace is missing." };
    const [existing] = await db.select({ id: schema.components.id, listingKind: schema.components.listingKind, reviewStatus: schema.components.reviewStatus }).from(schema.components).where(and(eq(schema.components.namespaceId, namespace.id), eq(schema.components.name, data.name))).limit(1);
    if (existing && existing.listingKind !== "tool") return { ok: false as const, error: "That slug is already used by a component." };
    if (existing?.reviewStatus === "approved") return { ok: false as const, error: "Edit this live tool from your Listings dashboard." };

    let componentId = existing?.id;
    if (componentId) {
      await db.update(schema.components).set({
        title: data.title, description: data.description, category: data.category, originalUrl: metadata.canonicalUrl, siteUrl: metadata.canonicalUrl, siteDomain: domain,
        ogTitle: metadata.title || null, ogDescription: metadata.description || null, ogImageUrl: metadata.imageUrl,
        showcaseImageUrls, toolPricing: data.pricing, previewImageUrl: showcaseImageUrls[0], reviewStatus: "pending", reviewReason: null, reviewedBy: null, reviewedAt: null,
        submittedAt: new Date(), updatedAt: new Date(),
      }).where(eq(schema.components.id, componentId));
    } else {
      const [created] = await db.insert(schema.components).values({
        namespaceId: namespace.id, name: data.name, title: data.title, description: data.description, category: data.category,
        listingKind: "tool", componentType: "tool", framework: "web", itemType: "modulora:tool", sourceModel: "external-site",
        visibility: "public", distributionChannels: [], originalUrl: metadata.canonicalUrl, previewImageUrl: showcaseImageUrls[0],
        siteUrl: metadata.canonicalUrl, siteDomain: domain, ogTitle: metadata.title || null, ogDescription: metadata.description || null,
        ogImageUrl: metadata.imageUrl, showcaseImageUrls, toolPricing: data.pricing, reviewStatus: "pending",
      }).returning({ id: schema.components.id });
      if (!created) return { ok: false as const, error: "Could not create the listing." };
      componentId = created.id;
    }

    const [latest] = await db.select({ version: schema.componentVersions.version }).from(schema.componentVersions).where(eq(schema.componentVersions.componentId, componentId)).orderBy(desc(schema.componentVersions.publishedAt)).limit(1);
    const version = nextPatch(latest?.version ?? null);
    const snapshot = { kind: "tool", siteUrl: metadata.canonicalUrl, domain, title: data.title, description: data.description, category: data.category, pricing: data.pricing, showcaseImageUrls, og: metadata };
    const [createdVersion] = await db.insert(schema.componentVersions).values({ componentId, version, licenseKind: "custom", registryItem: snapshot, shadcnItemUrl: metadata.canonicalUrl }).returning({ id: schema.componentVersions.id });
    if (!createdVersion) return { ok: false as const, error: "Could not create the listing version." };
    await db.update(schema.components).set({ latestVersionId: createdVersion.id }).where(eq(schema.components.id, componentId));
    await db.insert(schema.evidenceRecords).values([
      { componentVersionId: createdVersion.id, type: "publisher-identity", status: "asserted", issuer: "modulora-platform", scope: `Submitted by @${user.username}.`, limitations: "Account association does not establish rights beyond the verified domain evidence." },
      { componentVersionId: createdVersion.id, type: "domain-verified", status: "passed", issuer: "modulora-platform", scope: domain, limitations: "DNS control was confirmed for this exact domain; this does not certify the site's safety, usefulness, or legal status." },
      { componentVersionId: createdVersion.id, type: "source-not-assessed", status: "not-applicable", issuer: "modulora-platform", scope: "External tool/site listing", limitations: "This listing links to a live site and does not publish installable source through Modulora." },
    ]);
    await fireReviewWebhook({ componentId, title: data.title, username: user.username, name: data.name, category: data.category, paid: false, listingKind: "tool", origin: new URL(request.url).origin });
    return { ok: true as const, id: componentId, name: data.name };
  });

export const fetchToolForEdit = createServerFn({ method: "GET" })
  .validator((data: { name: string }) => ({ name: slug(String(data.name ?? "")) }))
  .handler(async ({ data }): Promise<EditableToolListing | null> => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = database();
    if (!user?.username || !db) return null;
    const [row] = await db
      .select({ component: schema.components, draft: schema.toolListingDrafts })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .leftJoin(schema.toolListingDrafts, eq(schema.toolListingDrafts.componentId, schema.components.id))
      .where(and(eq(schema.namespaces.name, user.username), eq(schema.components.name, data.name), eq(schema.components.listingKind, "tool")))
      .limit(1);
    if (!row?.component.siteUrl) return null;
    const payload = row.draft?.payload;
    const siteUrl = payload?.siteUrl ?? row.component.siteUrl;
    return {
      name: row.component.name,
      title: payload?.title ?? row.component.title,
      description: payload?.description ?? row.component.description,
      category: payload?.category ?? row.component.category,
      siteUrl,
      showcaseImageUrls: payload?.showcaseImageUrls ?? row.component.showcaseImageUrls,
      pricing: payload?.pricing ?? row.component.toolPricing ?? "free",
      preview: {
        canonicalUrl: siteUrl,
        title: payload?.ogTitle ?? row.component.ogTitle ?? payload?.title ?? row.component.title,
        description: payload?.ogDescription ?? row.component.ogDescription ?? payload?.description ?? row.component.description,
        imageUrl: payload?.ogImageUrl ?? row.component.ogImageUrl,
      },
      editStatus: row.draft?.status ?? null,
      reviewReason: row.draft?.reviewReason ?? null,
    };
  });

export const updateToolListing = createServerFn({ method: "POST" })
  .validator((data: ToolListingInput) => ({
    name: slug(String(data.name ?? "")),
    title: String(data.title ?? "").trim(),
    description: String(data.description ?? "").trim(),
    category: String(data.category ?? "").trim(),
    siteUrl: String(data.siteUrl ?? "").trim(),
    showcaseImageUrls: Array.isArray(data.showcaseImageUrls) ? data.showcaseImageUrls.map(String) : [],
    pricing: String(data.pricing ?? "free") as ToolListingInput["pricing"],
  }))
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = request ? await getCurrentUser(request) : null;
    const db = database();
    if (!user?.username || !db) return { ok: false as const, error: "Sign in with a creator profile first." };
    if (data.title.length < 2 || data.title.length > 120) return { ok: false as const, error: "Title must be 2–120 characters." };
    if (data.description.length < 24 || data.description.length > 500) return { ok: false as const, error: "Description must be 24–500 characters." };
    if (!isCategoryId(data.category)) return { ok: false as const, error: "Choose a supported category." };
    if (!isToolPricing(data.pricing)) return { ok: false as const, error: "Choose Free, Freemium, or Paid pricing." };
    const showcaseImageUrls = normalizeToolShowcaseImages(data.showcaseImageUrls, user.id);
    if (!showcaseImageUrls) return { ok: false as const, error: "Upload 1–6 showcase images before submitting." };
    const media = getMediaBucket();
    if (!media) return { ok: false as const, error: "Media storage is not configured." };
    const storedImages = await Promise.all(showcaseImageUrls.map((url) => media.head(url.slice("/i/".length))));
    if (storedImages.some((image) => !image)) return { ok: false as const, error: "One or more showcase images are no longer available. Upload them again." };
    const parsed = normalizeSiteUrl(data.siteUrl);
    if (!parsed) return { ok: false as const, error: "Enter a valid HTTPS site URL." };
    const domain = await verifiedDomainForUser(db, user.id, parsed.toString());
    if (!domain) return { ok: false as const, error: "Verify this exact domain in Settings before submitting it." };
    let metadata;
    try { metadata = await fetchToolMetadata(parsed.toString(), domain, user.id); }
    catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Could not inspect the site." }; }

    const [component] = await db
      .select({ id: schema.components.id, reviewStatus: schema.components.reviewStatus })
      .from(schema.components)
      .innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId))
      .where(and(eq(schema.namespaces.name, user.username), eq(schema.components.name, data.name), eq(schema.components.listingKind, "tool")))
      .limit(1);
    if (!component) return { ok: false as const, error: "Tool listing not found." };
    const [latest] = await db.select({ version: schema.componentVersions.version }).from(schema.componentVersions).where(eq(schema.componentVersions.componentId, component.id)).orderBy(desc(schema.componentVersions.publishedAt)).limit(1);
    const version = nextPatch(latest?.version ?? null);
    const payload: typeof schema.toolListingDrafts.$inferInsert.payload = {
      title: data.title, description: data.description, category: data.category,
      siteUrl: metadata.canonicalUrl, siteDomain: domain,
      ogTitle: metadata.title || null, ogDescription: metadata.description || null, ogImageUrl: metadata.imageUrl,
      showcaseImageUrls, pricing: data.pricing,
    };
    const snapshot = { kind: "tool", ...payload, domain, og: metadata };
    const [createdVersion] = await db.insert(schema.componentVersions).values({ componentId: component.id, version, licenseKind: "custom", registryItem: snapshot, shadcnItemUrl: metadata.canonicalUrl }).returning({ id: schema.componentVersions.id });
    if (!createdVersion) return { ok: false as const, error: "Could not create the edit version." };
    await db.insert(schema.evidenceRecords).values([
      { componentVersionId: createdVersion.id, type: "publisher-identity", status: "asserted", issuer: "modulora-platform", scope: `Edited by @${user.username}.`, limitations: "Account association does not establish rights beyond the verified domain evidence." },
      { componentVersionId: createdVersion.id, type: "domain-verified", status: "passed", issuer: "modulora-platform", scope: domain, limitations: "DNS control was confirmed for this exact domain; this does not certify the site's safety, usefulness, or legal status." },
      { componentVersionId: createdVersion.id, type: "source-not-assessed", status: "not-applicable", issuer: "modulora-platform", scope: "External tool/site listing edit", limitations: "This listing links to a live site and does not publish installable source through Modulora." },
    ]);
    const now = new Date();
    if (component.reviewStatus !== "approved") {
      const [updated] = await db.update(schema.components).set({
        title: payload.title, description: payload.description, category: payload.category,
        originalUrl: payload.siteUrl, previewImageUrl: payload.showcaseImageUrls[0],
        siteUrl: payload.siteUrl, siteDomain: payload.siteDomain,
        ogTitle: payload.ogTitle, ogDescription: payload.ogDescription, ogImageUrl: payload.ogImageUrl,
        showcaseImageUrls: payload.showcaseImageUrls, toolPricing: payload.pricing,
        latestVersionId: createdVersion.id, reviewStatus: "pending", reviewReason: null,
        reviewedBy: null, reviewedAt: null, submittedAt: now, updatedAt: now,
      }).where(and(eq(schema.components.id, component.id), eq(schema.components.reviewStatus, component.reviewStatus))).returning({ id: schema.components.id });
      if (!updated) return { ok: false as const, error: "The listing changed while you were editing. Refresh and try again." };
      await db.delete(schema.toolListingDrafts).where(eq(schema.toolListingDrafts.componentId, component.id));
      await fireReviewWebhook({ componentId: component.id, title: data.title, username: user.username, name: data.name, category: data.category, paid: false, listingKind: "tool", submissionKind: "edit", origin: new URL(request.url).origin });
      return { ok: true as const, id: component.id, name: data.name };
    }

    await db.insert(schema.toolListingDrafts).values({ componentId: component.id, componentVersionId: createdVersion.id, payload, status: "pending", reviewReason: null, submittedAt: now, updatedAt: now }).onConflictDoUpdate({ target: schema.toolListingDrafts.componentId, set: { componentVersionId: createdVersion.id, payload, status: "pending", reviewReason: null, submittedAt: now, updatedAt: now } });
    await fireReviewWebhook({ componentId: component.id, title: data.title, username: user.username, name: data.name, category: data.category, paid: false, listingKind: "tool", submissionKind: "edit", origin: new URL(request.url).origin });
    return { ok: true as const, id: component.id, name: data.name };
  });

export interface ToolReviewItem {
  id: string; name: string; namespace: string; title: string; description: string; category: string; siteUrl: string;
  siteDomain: string; ogTitle: string | null; ogDescription: string | null; ogImageUrl: string | null; showcaseImageUrls: string[]; pricing: "free" | "freemium" | "paid"; submittedAt: string; isEdit: boolean; componentVersionId: string;
}

export const fetchToolForReview = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => ({ id: String(data.id ?? "") }))
  .handler(async ({ data }): Promise<ToolReviewItem | null> => {
    const request = getRequest(); const actor = request ? await getCurrentUser(request) : null; const db = database();
    if (!actor?.isCurator || !db) return null;
    const [row] = await db.select({ component: schema.components, namespace: schema.namespaces.name, draft: schema.toolListingDrafts }).from(schema.components).innerJoin(schema.namespaces, eq(schema.namespaces.id, schema.components.namespaceId)).leftJoin(schema.toolListingDrafts, eq(schema.toolListingDrafts.componentId, schema.components.id)).where(and(eq(schema.components.id, data.id), eq(schema.components.listingKind, "tool"))).limit(1);
    if (!row?.component.siteUrl || !row.component.siteDomain) return null;
    if (row.draft?.status === "pending") {
      const payload = row.draft.payload;
      return { id: row.component.id, name: row.component.name, namespace: row.namespace, ...payload, submittedAt: row.draft.submittedAt.toISOString(), isEdit: true, componentVersionId: row.draft.componentVersionId };
    }
    if (row.component.reviewStatus !== "pending" || !row.component.latestVersionId) return null;
    return { id: row.component.id, name: row.component.name, namespace: row.namespace, title: row.component.title, description: row.component.description, category: row.component.category, siteUrl: row.component.siteUrl, siteDomain: row.component.siteDomain, ogTitle: row.component.ogTitle, ogDescription: row.component.ogDescription, ogImageUrl: row.component.ogImageUrl, showcaseImageUrls: row.component.showcaseImageUrls, pricing: row.component.toolPricing ?? "free", submittedAt: row.component.submittedAt.toISOString(), isEdit: false, componentVersionId: row.component.latestVersionId };
  });

export const decideToolReview = createServerFn({ method: "POST" })
  .validator((data: ToolReviewDecisionInput) => data)
  .handler(async ({ data }) => {
    const request = getRequest();
    const actor = request ? await getCurrentUser(request) : null;
    const db = database();
    if (!db) return { ok: false as const, error: "Database is not configured." };
    return decideToolReviewCore(db, actor, data);
  });
