ALTER TABLE "user" ADD COLUMN "profile_font" text DEFAULT 'inter' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "profile_theme_light" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "profile_theme_dark" jsonb DEFAULT '{}'::jsonb NOT NULL;