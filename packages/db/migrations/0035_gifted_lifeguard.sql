CREATE TABLE "tool_listing_drafts" (
	"component_id" uuid PRIMARY KEY NOT NULL,
	"component_version_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tool_listing_drafts" ADD CONSTRAINT "tool_listing_drafts_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_listing_drafts" ADD CONSTRAINT "tool_listing_drafts_component_version_id_component_versions_id_fk" FOREIGN KEY ("component_version_id") REFERENCES "public"."component_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tool_listing_drafts_status" ON "tool_listing_drafts" USING btree ("status");