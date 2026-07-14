ALTER TABLE "moderation_cases" ADD COLUMN "reporter_contact_token_hash" text;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD COLUMN "reporter_contact_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD COLUMN "reporter_contact_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_reporter_contact_token_hash_unique" UNIQUE("reporter_contact_token_hash");