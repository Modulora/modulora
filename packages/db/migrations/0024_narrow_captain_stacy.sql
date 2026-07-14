CREATE TABLE "moderation_case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid,
	"component_ref" text NOT NULL,
	"reason" text NOT NULL,
	"details" text NOT NULL,
	"reporter_email" text NOT NULL,
	"reporter_user_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "similarity_screens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"component_version_id" uuid NOT NULL,
	"method_version" text NOT NULL,
	"status" text NOT NULL,
	"results" jsonb NOT NULL,
	"corpus_limitation" text NOT NULL,
	"submitter_classification" jsonb,
	"resolved_by" text,
	"resolution" text,
	"resolution_rationale" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "moderation_state" text;--> statement-breakpoint
ALTER TABLE "moderation_case_events" ADD CONSTRAINT "moderation_case_events_case_id_moderation_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_case_events" ADD CONSTRAINT "moderation_case_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "similarity_screens" ADD CONSTRAINT "similarity_screens_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "similarity_screens" ADD CONSTRAINT "similarity_screens_component_version_id_component_versions_id_fk" FOREIGN KEY ("component_version_id") REFERENCES "public"."component_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "similarity_screens" ADD CONSTRAINT "similarity_screens_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_case_events_case" ON "moderation_case_events" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "moderation_cases_status" ON "moderation_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "similarity_screens_component" ON "similarity_screens" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "similarity_screens_status" ON "similarity_screens" USING btree ("status");