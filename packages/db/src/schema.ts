/**
 * Catalog schema for the Modulora public core.
 * Mirrors @modulora/spec v0: a version is immutable after publication;
 * evidence and moderation state are append-only.
 * Better Auth manages its own tables via its Drizzle adapter migrations.
 */
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const namespaces = pgTable("namespaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const components = pgTable(
  "components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    namespaceId: uuid("namespace_id")
      .notNull()
      .references(() => namespaces.id),
    name: text("name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    framework: text("framework", { enum: ["react"] }).notNull(),
    sourceModel: text("source_model", {
      enum: ["open-source", "external-commercial", "private-team", "hosted-commercial"],
    }).notNull(),
    visibility: text("visibility", { enum: ["public", "unlisted", "private"] }).notNull(),
    purchaseUrl: text("purchase_url"),
    purchaseDomain: text("purchase_domain"),
    purchaseDomainVerifiedAt: timestamp("purchase_domain_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("components_namespace_name").on(t.namespaceId, t.name),
    index("components_visibility").on(t.visibility),
  ],
);

export const componentVersions = pgTable(
  "component_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id),
    version: text("version").notNull(),
    licenseKind: text("license_kind", { enum: ["spdx", "commercial", "custom"] }).notNull(),
    spdxExpression: text("spdx_expression"),
    sourceRepository: text("source_repository"),
    sourceCommit: text("source_commit"),
    shadcnItemUrl: text("shadcn_item_url").notNull(),
    shadcnItemSha256: text("shadcn_item_sha256").notNull(),
    releaseDigest: text("release_digest"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    deprecatedAt: timestamp("deprecated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("component_versions_unique").on(t.componentId, t.version)],
);

export const evidenceRecords = pgTable(
  "evidence_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    componentVersionId: uuid("component_version_id")
      .notNull()
      .references(() => componentVersions.id),
    type: text("type", {
      enum: [
        "owner-verified",
        "source-linked",
        "artifact-signed",
        "secret-scan",
        "dependency-scan",
        "license-scan",
        "static-analysis",
        "build-checked",
        "human-reviewed",
        "source-not-assessed",
        "deprecated",
        "revoked",
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
