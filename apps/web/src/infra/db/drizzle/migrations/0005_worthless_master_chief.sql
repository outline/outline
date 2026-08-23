CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_body" jsonb NOT NULL,
	"response_status" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_api_keys" ADD COLUMN "prefix" text NOT NULL;--> statement-breakpoint
ALTER TABLE "business_api_keys" ADD COLUMN "scopes" text[] DEFAULT '{"products:read","categories:read"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "business_api_keys" ADD COLUMN "creator_id" uuid;--> statement-breakpoint
ALTER TABLE "business_api_keys" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "business_api_keys" ADD COLUMN "rotated_from_key_id" uuid;--> statement-breakpoint
ALTER TABLE "business_api_keys" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_idempotency_keys_lookup" ON "idempotency_keys" USING btree ("business_id" uuid_ops,"idempotency_key" text_ops);