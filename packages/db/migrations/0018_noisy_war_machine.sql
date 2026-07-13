CREATE TABLE "collection_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"unit_amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"license_template" text DEFAULT 'modulora-commercial-v1' NOT NULL,
	"license_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"buyer_user_id" text NOT NULL,
	"seller_user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"fee_amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"license_template" text,
	"license_text_snapshot" text,
	"license_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "via_collection_purchase_id" uuid;--> statement-breakpoint
ALTER TABLE "collection_prices" ADD CONSTRAINT "collection_prices_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_purchases" ADD CONSTRAINT "collection_purchases_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_purchases" ADD CONSTRAINT "collection_purchases_buyer_user_id_user_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_purchases" ADD CONSTRAINT "collection_purchases_seller_user_id_user_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_prices_active" ON "collection_prices" USING btree ("collection_id") WHERE "collection_prices"."active";--> statement-breakpoint
CREATE UNIQUE INDEX "collection_purchases_buyer" ON "collection_purchases" USING btree ("buyer_user_id","collection_id") WHERE "collection_purchases"."status" = 'paid';--> statement-breakpoint
CREATE INDEX "collection_purchases_collection" ON "collection_purchases" USING btree ("collection_id");