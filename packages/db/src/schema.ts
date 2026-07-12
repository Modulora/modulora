/**
 * Catalog schema for the Modulora public core.
 *
 * Mirrors @modulora/spec v0: a version is immutable after publication;
 * evidence and moderation state are append-only.
 *
 * Modulora hosts uploaded component source (registry-item shape) so that
 * `shadcn add https://modulora.dev/r/@username/name` works directly. The
 * canonical stored form is a shadcn registry-item JSON plus its files;
 * link-only (external-commercial) components store no source.
 *
 * Better Auth tables (user/session/account/verification) are defined here so
 * a single Drizzle migration owns the whole schema.
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ─────────────────────────────────────────────────────────
 * Better Auth core tables (default names + fields for v1.6).
 * ───────────────────────────────────────────────────────── */

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Modulora profile fields:
  username: text("username").unique(),
  usernameChangedAt: timestamp("username_changed_at"),
  bio: text("bio"),
  websiteUrl: text("website_url"),
  githubUrl: text("github_url"),
  xUrl: text("x_url"),
  // GitHub login proven via OAuth sign-in (verified identity). Null = not
  // connected; a hand-typed github_url that differs is treated as unverified.
  githubUsername: text("github_username"),
  // X (Twitter) handle proven via OAuth. Same verified-vs-self-asserted model.
  xUsername: text("x_username"),
  // Publishing policy acceptance (audit): which version, and when.
  publishingPolicyVersion: text("publishing_policy_version"),
  publishingPolicyAcceptedAt: timestamp("publishing_policy_accepted_at", { withTimezone: true }),
  // Stripe Connect payout account (creator earnings). Enabled = onboarding
  // complete and charges/payouts active.
  stripeAccountId: text("stripe_account_id"),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  // Curators can approve/reject submitted components for public listing.
  isCurator: boolean("is_curator").notNull().default(false),
  // Shiki theme used for code views (detail page, review) chosen in settings.
  editorTheme: text("editor_theme").notNull().default("github-dark-default"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ─────────────────────────────────────────────────────────
 * Ownership: organizations + namespaces.
 * A namespace (`@username` or `@org`) is owned by exactly one of a user or
 * an organization. This is where components live.
 * ───────────────────────────────────────────────────────── */

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const namespaces = pgTable(
  "namespaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    ownerUserId: text("owner_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    organizationId: uuid("organization_id").references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("namespaces_owner_user").on(t.ownerUserId),
    index("namespaces_org").on(t.organizationId),
  ],
);

/* ─────────────────────────────────────────────────────────
 * Components + immutable versions.
 * ───────────────────────────────────────────────────────── */

export type DistributionChannel =
  | "shadcn"
  | "modulora-cli"
  | "compatible-cli";

export const components = pgTable(
  "components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    namespaceId: uuid("namespace_id")
      .notNull()
      .references(() => namespaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    framework: text("framework", { enum: ["react"] }).notNull(),
    // registry-item type per shadcn: registry:block | registry:component | ...
    itemType: text("item_type").notNull().default("registry:component"),
    sourceModel: text("source_model", {
      enum: ["open-source", "external-commercial", "private-team", "hosted-commercial"],
    }).notNull(),
    visibility: text("visibility", { enum: ["public", "unlisted", "private"] })
      .notNull()
      .default("public"),
    // Creator-controlled distribution. A component may be shadcn-only and
    // explicitly opt out of Modulora CLI distribution.
    distributionChannels: jsonb("distribution_channels")
      .$type<DistributionChannel[]>()
      .notNull()
      .default(["shadcn", "modulora-cli", "compatible-cli"]),
    // Creator-supplied install commands for the channels they run themselves.
    // Modulora CLI is derived; shadcn / other CLIs are entered by the creator.
    shadcnCommand: text("shadcn_command"),
    otherCliCommand: text("other_cli_command"),
    // Provenance: canonical source + attribution links.
    originalUrl: text("original_url"),
    inspiredBy: jsonb("inspired_by").$type<string[]>().notNull().default([]),
    // Latest published version id, for fast reads.
    latestVersionId: uuid("latest_version_id"),
    // Presentation:
    previewImageUrl: text("preview_image_url"),
    // Closed-source / external redirect:
    purchaseUrl: text("purchase_url"),
    purchaseDomain: text("purchase_domain"),
    purchaseDomainVerifiedAt: timestamp("purchase_domain_verified_at", {
      withTimezone: true,
    }),
    // Curation: nothing is publicly listed until a curator approves it.
    reviewStatus: text("review_status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    reviewReason: text("review_reason"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("components_namespace_name").on(t.namespaceId, t.name),
    index("components_visibility").on(t.visibility),
    index("components_review_status").on(t.reviewStatus),
  ],
);

export const componentVersions = pgTable(
  "component_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    licenseKind: text("license_kind", { enum: ["spdx", "commercial", "custom"] }).notNull(),
    spdxExpression: text("spdx_expression"),
    sourceRepository: text("source_repository"),
    sourceCommit: text("source_commit"),
    // Canonical served registry-item JSON (shadcn shape). Null for link-only.
    registryItem: jsonb("registry_item"),
    // External link-only items keep the URL Modulora references.
    shadcnItemUrl: text("shadcn_item_url"),
    contentSha256: text("content_sha256"),
    releaseDigest: text("release_digest"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    deprecatedAt: timestamp("deprecated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("component_versions_unique").on(t.componentId, t.version)],
);

/**
 * Uploaded source files for a version. Small text lives in Postgres; large
 * binary assets (preview media) move to R2 later via `storageKey`.
 */
export const componentFiles = pgTable(
  "component_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentVersionId: uuid("component_version_id")
      .notNull()
      .references(() => componentVersions.id, { onDelete: "cascade" }),
    // Target path in the consumer's project, e.g. "components/ui/calendar.tsx".
    path: text("path").notNull(),
    // shadcn file type: registry:component | registry:ui | registry:lib | ...
    fileType: text("file_type").notNull().default("registry:component"),
    // Authoring role. Only `component` files ship in the install payload;
    // demos/styles/system files exist for the live preview sandbox.
    role: text("role", { enum: ["component", "demo", "styles", "system"] })
      .notNull()
      .default("component"),
    content: text("content"),
    storageKey: text("storage_key"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [
    uniqueIndex("component_files_version_path").on(t.componentVersionId, t.path),
    index("component_files_version").on(t.componentVersionId),
  ],
);

export const evidenceRecords = pgTable(
  "evidence_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentVersionId: uuid("component_version_id")
      .notNull()
      .references(() => componentVersions.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        // Provable, honest evidence types:
        "publisher-identity",
        "content-integrity",
        "install-parity",
        "domain-verified",
        "secret-scan",
        "source-not-assessed",
        "deprecated",
        "revoked",
        // Reserved for future automated checks (not yet issued):
        "dependency-scan",
        "license-scan",
        "static-analysis",
        "build-checked",
        "human-reviewed",
      ],
    }).notNull(),
    status: text("status", {
      enum: ["passed", "failed", "warning", "asserted", "not-applicable"],
    }).notNull(),
    issuer: text("issuer").notNull(),
    scope: text("scope"),
    toolVersion: text("tool_version"),
    limitations: text("limitations"),
    superseded: boolean("superseded").notNull().default(false),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("evidence_records_version").on(t.componentVersionId)],
);

/**
 * Domains a user has proven control of via a DNS TXT record. Used to back the
 * honest "domain verified" evidence and to gate paid components' purchase URLs.
 */
export const verifiedDomains = pgTable(
  "verified_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    token: text("token").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("verified_domains_owner_domain").on(t.ownerUserId, t.domain)],
);

/**
 * Marketplace price for a component sold on Modulora (we host the source and
 * gate it behind purchase). A component has at most one active price; the
 * external-redirect model keeps using components.purchaseUrl instead.
 */
export const componentPrices = pgTable(
  "component_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    unitAmount: integer("unit_amount").notNull(), // minor units (cents)
    currency: text("currency").notNull().default("usd"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("component_prices_active").on(t.componentId).where(sql`${t.active}`)],
);

/**
 * A completed purchase = a buyer's entitlement to install a paid component.
 * Records the money split (gross, Modulora fee) for payout accounting (#32).
 */
export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    buyerUserId: text("buyer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sellerUserId: text("seller_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    feeAmount: integer("fee_amount").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    status: text("status", { enum: ["pending", "paid", "refunded"] }).notNull().default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("purchases_buyer_component").on(t.buyerUserId, t.componentId).where(sql`${t.status} = 'paid'`),
    index("purchases_component").on(t.componentId),
    index("purchases_seller").on(t.sellerUserId),
  ],
);

/**
 * Paid promotion: a creator buys clearly-labeled featured placement for a
 * component over a time window. Never mixed with organic rank or trust.
 */
export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slot: text("slot", { enum: ["featured"] }).notNull().default("featured"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status", { enum: ["pending", "active", "expired", "canceled"] }).notNull().default("pending"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("promotions_active").on(t.slot, t.status, t.endsAt)],
);

export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  // Set once the reserved username is claimed by a signed-in user.
  claimedByUserId: text("claimed_by_user_id").references(() => users.id),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
