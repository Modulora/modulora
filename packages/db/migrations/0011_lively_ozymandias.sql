CREATE TABLE "component_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"unit_amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"owner_user_id" text NOT NULL,
	"slot" text DEFAULT 'featured' NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"stripe_checkout_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"buyer_user_id" text NOT NULL,
	"seller_user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"fee_amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "stripe_account_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "payouts_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "component_prices" ADD CONSTRAINT "component_prices_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyer_user_id_user_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_seller_user_id_user_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "component_prices_active" ON "component_prices" USING btree ("component_id") WHERE "component_prices"."active";--> statement-breakpoint
CREATE INDEX "promotions_active" ON "promotions" USING btree ("slot","status","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_buyer_component" ON "purchases" USING btree ("buyer_user_id","component_id") WHERE "purchases"."status" = 'paid';--> statement-breakpoint
CREATE INDEX "purchases_component" ON "purchases" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "purchases_seller" ON "purchases" USING btree ("seller_user_id");