ALTER TABLE "component_prices" ADD COLUMN "license_template" text DEFAULT 'modulora-commercial-v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "component_prices" ADD COLUMN "license_text" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "license_template" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "license_text_snapshot" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "license_accepted_at" timestamp with time zone;