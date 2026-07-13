CREATE TABLE "install_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"component_version_id" uuid,
	"user_id" text,
	"version" text DEFAULT '' NOT NULL,
	"digest" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"client" text DEFAULT 'modulora-cli' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "install_receipts" ADD CONSTRAINT "install_receipts_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "install_receipts" ADD CONSTRAINT "install_receipts_component_version_id_component_versions_id_fk" FOREIGN KEY ("component_version_id") REFERENCES "public"."component_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "install_receipts" ADD CONSTRAINT "install_receipts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "install_receipts_component" ON "install_receipts" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "install_receipts_user" ON "install_receipts" USING btree ("user_id");