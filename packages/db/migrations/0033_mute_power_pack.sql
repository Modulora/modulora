ALTER TABLE "components" ADD COLUMN "listing_kind" text DEFAULT 'component' NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "site_url" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "site_domain" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "og_title" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "og_description" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "og_image_url" text;