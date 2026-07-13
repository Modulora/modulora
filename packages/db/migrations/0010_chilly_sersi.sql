ALTER TABLE "user" ADD COLUMN "publishing_policy_version" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "publishing_policy_accepted_at" timestamp with time zone;