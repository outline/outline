ALTER TABLE "stock_movements" ALTER COLUMN "variant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "voucher_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "voucher_discount" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;