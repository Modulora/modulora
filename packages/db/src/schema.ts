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
  /** Modulora Plus entitlement (bookmarks, lists, curated public lists). */
  isPlus: boolean("is_plus").notNull().default(false),
  /** Stripe customer (subscriptions/billing portal — distinct from the
   *  Connect account used for creator payouts). */
  stripeCustomerId: text("stripe_customer_id"),
  plusSubscriptionId: text("plus_subscription_id"),
  // Shiki theme used for code views (detail page, review) chosen in settings.
  editorTheme: text("editor_theme").notNull().default("github-dark-default"),
  // Syntax palette accessibility. Code themes otherwise follow app light/dark
  // mode and are locked to Pierre's maintained theme family.
  colorVisionMode: text("color_vision_mode").notNull().default("standard"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Public, non-purchasable profile acknowledgements. */
export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badge: text("badge").notNull(),
    source: text("source").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_badges_user_badge").on(t.userId, t.badge)],
);

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

/** Better Auth device-authorization plugin (RFC 8628) — CLI login. */
export const deviceCodes = pgTable("device_code", {
  id: text("id").primaryKey(),
  deviceCode: text("device_code").notNull(),
  userCode: text("user_code").notNull(),
  userId: text("user_id"),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull(),
  lastPolledAt: timestamp("last_polled_at"),
  pollingInterval: integer("polling_interval"),
  clientId: text("client_id"),
  scope: text("scope"),
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
    // Optional shadcn-style type (button, dialog, data-table, …).
    componentType: text("component_type"),
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
    reviewStatus: text("review_status", { enum: ["draft", "pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    reviewReason: text("review_reason"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // Active moderation state, shown publicly in scoped language when set.
    moderationState: text("moderation_state", { enum: ["restricted", "removed"] }),
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

/**
 * Append-only curation records (#69). One row per decision; historical rows
 * are never updated or deleted when a release is re-reviewed. The component's
 * mutable review_status is a pointer; these rows are the durable audit trail.
 */
export const reviewRecords = pgTable(
  "review_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    /** Latest version at decision time, when one exists. */
    componentVersionId: uuid("component_version_id"),
    reviewerUserId: text("reviewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Which published standard the decision applied (e.g. "alpha-1"). */
    standardVersion: text("standard_version").notNull(),
    decision: text("decision", {
      enum: ["approve", "request-changes", "reject", "escalate"],
    }).notNull(),
    /** Explicit per-check results keyed by check id: pass | flag | not-applicable. */
    checklist: jsonb("checklist").$type<Record<string, string>>().notNull(),
    rationale: text("rationale").notNull(),
    /** The scope limitation statement shown with the decision, verbatim. */
    limitations: text("limitations").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("review_records_component").on(t.componentId)],
);

/**
 * Pre-publication similarity screening (#67). One row per screened release;
 * blocked screens hold the submission out of the review queue until a curator
 * resolves them. Similarity is a review signal, never an accusation.
 */
export const similarityScreens = pgTable(
  "similarity_screens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    componentVersionId: uuid("component_version_id")
      .notNull()
      .references(() => componentVersions.id, { onDelete: "cascade" }),
    methodVersion: text("method_version").notNull(),
    status: text("status", { enum: ["clear", "potential", "blocked", "error"] }).notNull(),
    /** Explainable candidates: matched refs, files, scores, line regions. */
    results: jsonb("results").$type<Record<string, unknown>>().notNull(),
    corpusLimitation: text("corpus_limitation").notNull(),
    /** Submitter's per-candidate classification claims + supporting URLs. */
    submitterClassification: jsonb("submitter_classification").$type<Record<string, unknown> | null>(),
    /** Curator resolution for blocked screens. */
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolution: text("resolution", {
      enum: ["cleared", "authorized-derivative", "attribution-required", "rejected", "escalated"],
    }),
    resolutionRationale: text("resolution_rationale"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("similarity_screens_component").on(t.componentId), index("similarity_screens_status").on(t.status)],
);

/**
 * Durable moderation cases (#67): plagiarism, impersonation, copied previews,
 * attribution, and brand-association reports — account optional. Reporter
 * contact stays private; state transitions append events, never overwrite.
 */
export const moderationCases = pgTable(
  "moderation_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id").references(() => components.id, { onDelete: "set null" }),
    componentRef: text("component_ref").notNull(),
    reason: text("reason").notNull(),
    details: text("details").notNull(),
    /** Private — never exposed publicly. */
    reporterEmail: text("reporter_email").notNull(),
    reporterUserId: text("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status", {
      enum: ["open", "restricted", "takedown", "corrected", "revoked", "appealed", "closed"],
    })
      .notNull()
      .default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("moderation_cases_status").on(t.status)],
);

/** Append-only moderation history: notices, responses, decisions, appeals. */
export const moderationCaseEvents = pgTable(
  "moderation_case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => moderationCases.id, { onDelete: "cascade" }),
    action: text("action", {
      enum: ["opened", "noted", "restricted", "takedown", "corrected", "revoked", "appealed", "reopened", "closed"],
    }).notNull(),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("moderation_case_events_case").on(t.caseId)],
);

/** Append-only role-change audit: who granted/revoked curator, and when. */
export const roleChangeEvents = pgTable(
  "role_change_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["curator"] }).notNull(),
    priorValue: boolean("prior_value").notNull(),
    nextValue: boolean("next_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("role_change_events_target").on(t.targetUserId)],
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
        "similarity-screen",
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
    // Seller-set license: a standard template id (e.g. "modulora-commercial-v1")
    // or "custom" with the full text. Shown pre-purchase; buyer must agree.
    licenseTemplate: text("license_template").notNull().default("modulora-commercial-v1"),
    licenseText: text("license_text"),
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
    // Buyer's license agreement, recorded at checkout creation (provable log).
    licenseTemplate: text("license_template"),
    licenseTextSnapshot: text("license_text_snapshot"),
    licenseAcceptedAt: timestamp("license_accepted_at", { withTimezone: true }),
    // Set when this entitlement came from buying a collection (amount 0;
    // the money lives on the collection_purchases row).
    viaCollectionPurchaseId: uuid("via_collection_purchase_id"),
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
/**
 * Verified install receipts from the Modulora CLI. Each row is one `modulora
 * add` that completed. `verified` means the CLI-computed digest matched the
 * published digest at install time — the attribution signal for profit share
 * and analytics. userId is set when the installer was signed in.
 */
export const installReceipts = pgTable(
  "install_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    componentVersionId: uuid("component_version_id").references(() => componentVersions.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    version: text("version").notNull().default(""),
    digest: text("digest").notNull(),
    verified: boolean("verified").notNull().default(false),
    client: text("client").notNull().default("modulora-cli"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("install_receipts_component").on(t.componentId),
    index("install_receipts_user").on(t.userId),
  ],
);

/**
 * Collections — a creator's installable group of their own components
 * (e.g. a dashboard kit). Collections carry no source of their own: they
 * reference components, and only approved + public members ever serve.
 * Install trust is per member — the CLI verifies each component's digest.
 */
export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    namespaceId: uuid("namespace_id")
      .notNull()
      .references(() => namespaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // url-safe, unique per namespace
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    // External sale: the collection is sold on the creator's own site
    // (must be a verified domain). Mutually exclusive with a Modulora price.
    externalUrl: text("external_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("collections_namespace_name").on(t.namespaceId, t.name)],
);

export const collectionItems = pgTable(
  "collection_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [
    uniqueIndex("collection_items_unique").on(t.collectionId, t.componentId),
    index("collection_items_component_idx").on(t.componentId),
  ],
);

/**
 * Component lists (Plus): named groups of anyone's components, public or
 * private. Curation-as-content — never affects earnings or rank.
 */
export const lists = pgTable(
  "lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // url-safe slug, unique per user
    title: text("title").notNull(),
    visibility: text("visibility", { enum: ["public", "private"] }).notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lists_user_name").on(t.userId, t.name)],
);

export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("list_items_unique").on(t.listId, t.componentId)],
);

/** Personal bookmarks (Plus) — quick-save any component. Never affects earnings or rank. */
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("bookmarks_unique").on(t.userId, t.componentId)],
);

/** Bundle pricing for a collection — mirrors component_prices. */
export const collectionPrices = pgTable(
  "collection_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    unitAmount: integer("unit_amount").notNull(),
    currency: text("currency").notNull().default("usd"),
    active: boolean("active").notNull().default(true),
    licenseTemplate: text("license_template").notNull().default("modulora-commercial-v1"),
    licenseText: text("license_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("collection_prices_active").on(t.collectionId).where(sql`${t.active}`)],
);

/**
 * Buying a collection buys the bundle: one sale row here, plus a snapshot
 * of per-member purchase rows (purchases.via_collection_purchase_id) at
 * fulfillment time — later membership edits never change what was bought.
 */
export const collectionPurchases = pgTable(
  "collection_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
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
    licenseTemplate: text("license_template"),
    licenseTextSnapshot: text("license_text_snapshot"),
    licenseAcceptedAt: timestamp("license_accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("collection_purchases_buyer").on(t.buyerUserId, t.collectionId).where(sql`${t.status} = 'paid'`),
    index("collection_purchases_collection").on(t.collectionId),
  ],
);

/**
 * Component page views — one row per detail-page view of an approved public
 * component. Owner self-views are excluded at write time. Views are
 * analytics-only and never affect earnings (only verified installs do).
 */
export const componentViews = pgTable(
  "component_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "cascade" }),
    viewerUserId: text("viewer_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("component_views_component").on(t.componentId)],
);

/**
 * Profit-share distribution ledger. A payout run distributes the creator
 * pool (30% of distributable profit) for a period, weighted by verified CLI
 * installs. Each share row is one creator's accounting for that run:
 * accrued (this run) + carried (from earlier runs) → paid via Stripe
 * transfer when the total clears the threshold, otherwise carried forward.
 */
export const payoutRuns = pgTable("payout_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  distributableAmount: integer("distributable_amount").notNull(), // cents, input
  creatorPoolAmount: integer("creator_pool_amount").notNull(), // 30% of distributable
  totalVerifiedInstalls: integer("total_verified_installs").notNull().default(0),
  status: text("status", { enum: ["completed"] }).notNull().default("completed"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payoutRunShares = pgTable(
  "payout_run_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => payoutRuns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verifiedInstalls: integer("verified_installs").notNull().default(0),
    accruedAmount: integer("accrued_amount").notNull().default(0), // this run's share
    carriedAmount: integer("carried_amount").notNull().default(0), // balance carried in
    paidAmount: integer("paid_amount").notNull().default(0), // transferred this run
    stripeTransferId: text("stripe_transfer_id"),
    status: text("status", { enum: ["paid", "carried", "failed"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payout_run_shares_user").on(t.userId), index("payout_run_shares_run").on(t.runId)],
);

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
  claimedByUserId: text("claimed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Owner-issued alpha access invitations. Only a SHA-256 token digest is
 * stored; the bearer token exists solely in the emailed setup URL.
 */
export const alphaInvitations = pgTable(
  "alpha_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    waitlistEntryId: uuid("waitlist_entry_id")
      .notNull()
      .references(() => waitlistEntries.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull().unique(),
    invitedByUserId: text("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    acceptedByUserId: text("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    revokedByUserId: text("revoked_by_user_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    sendCount: integer("send_count").notNull().default(1),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alpha_invitations_email").on(t.email),
    index("alpha_invitations_waitlist").on(t.waitlistEntryId),
    index("alpha_invitations_accepted_user").on(t.acceptedByUserId),
    uniqueIndex("alpha_invitations_active_email")
      .on(t.email)
      .where(sql`${t.acceptedAt} is null and ${t.revokedAt} is null`),
  ],
);

/** Append-only lifecycle history for invitation administration. */
export const alphaInvitationEvents = pgTable(
  "alpha_invitation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => alphaInvitations.id, { onDelete: "cascade" }),
    action: text("action", { enum: ["issued", "resent", "revoked", "accepted"] }).notNull(),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("alpha_invitation_events_invitation").on(t.invitationId, t.createdAt)],
);
