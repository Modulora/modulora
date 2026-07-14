CREATE TABLE "alpha_invitation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"action" text NOT NULL,
	"actor_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alpha_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"waitlist_entry_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by_user_id" text,
	"accepted_by_user_id" text,
	"revoked_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"send_count" integer DEFAULT 1 NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alpha_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"badge" text NOT NULL,
	"source" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist_entries" DROP CONSTRAINT "waitlist_entries_claimed_by_user_id_user_id_fk";
--> statement-breakpoint
-- Pre-existing schema-drift repair: these two columns shipped before this
-- migration via the project-required `drizzle-kit push --force` workflow.
-- They are included here only so a fresh migration chain matches schema.ts;
-- the alpha-invitation feature does not introduce either column.
ALTER TABLE "collections" ADD COLUMN "external_url" text;--> statement-breakpoint
ALTER TABLE "components" ADD COLUMN "component_type" text;--> statement-breakpoint
ALTER TABLE "alpha_invitation_events" ADD CONSTRAINT "alpha_invitation_events_invitation_id_alpha_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."alpha_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alpha_invitation_events" ADD CONSTRAINT "alpha_invitation_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alpha_invitations" ADD CONSTRAINT "alpha_invitations_waitlist_entry_id_waitlist_entries_id_fk" FOREIGN KEY ("waitlist_entry_id") REFERENCES "public"."waitlist_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alpha_invitations" ADD CONSTRAINT "alpha_invitations_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alpha_invitations" ADD CONSTRAINT "alpha_invitations_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alpha_invitations" ADD CONSTRAINT "alpha_invitations_revoked_by_user_id_user_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alpha_invitation_events_invitation" ON "alpha_invitation_events" USING btree ("invitation_id","created_at");--> statement-breakpoint
CREATE INDEX "alpha_invitations_email" ON "alpha_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "alpha_invitations_waitlist" ON "alpha_invitations" USING btree ("waitlist_entry_id");--> statement-breakpoint
CREATE INDEX "alpha_invitations_accepted_user" ON "alpha_invitations" USING btree ("accepted_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "alpha_invitations_active_email" ON "alpha_invitations" USING btree ("email") WHERE "alpha_invitations"."accepted_at" is null and "alpha_invitations"."revoked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge" ON "user_badges" USING btree ("user_id","badge");--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
