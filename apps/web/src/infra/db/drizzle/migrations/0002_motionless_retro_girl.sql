CREATE TABLE "business_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_api_keys" ADD CONSTRAINT "business_api_keys_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_keys_business" ON "business_api_keys" USING btree ("business_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_api_keys_hash" ON "business_api_keys" USING btree ("key_hash" text_ops);