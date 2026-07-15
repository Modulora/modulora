ALTER TABLE "components" ADD COLUMN "showcase_image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "tool_pricing" text;