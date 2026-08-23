ALTER TABLE "branches" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "whatsapp_number" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "street_address" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "address_locality" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "address_region" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "address_country" text DEFAULT 'ID';--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "latitude" numeric;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "longitude" numeric;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "operating_hours" jsonb;