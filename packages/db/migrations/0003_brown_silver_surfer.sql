ALTER TABLE "components" ADD COLUMN "shadcn_command" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "other_cli_command" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "original_url" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "inspired_by" jsonb DEFAULT '[]'::jsonb NOT NULL;