ALTER TABLE "components" ADD COLUMN "review_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "review_reason" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "submitted_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_curator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "components_review_status" ON "components" USING btree ("review_status");