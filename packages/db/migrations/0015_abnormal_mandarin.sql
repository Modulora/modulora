CREATE TABLE "payout_run_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"verified_installs" integer DEFAULT 0 NOT NULL,
	"accrued_amount" integer DEFAULT 0 NOT NULL,
	"carried_amount" integer DEFAULT 0 NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"stripe_transfer_id" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"distributable_amount" integer NOT NULL,
	"creator_pool_amount" integer NOT NULL,
	"total_verified_installs" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payout_run_shares" ADD CONSTRAINT "payout_run_shares_run_id_payout_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."payout_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_run_shares" ADD CONSTRAINT "payout_run_shares_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_runs" ADD CONSTRAINT "payout_runs_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payout_run_shares_user" ON "payout_run_shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payout_run_shares_run" ON "payout_run_shares" USING btree ("run_id");