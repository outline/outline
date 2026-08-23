CREATE TABLE "rack_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"name" text NOT NULL,
	"rack" text,
	"shelf" text,
	"bin" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_batches" ADD COLUMN "warehouse_id" uuid;--> statement-breakpoint
ALTER TABLE "product_batches" ADD COLUMN "rack_location_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "source_warehouse_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "target_warehouse_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "source_rack_location_id" uuid;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "target_rack_location_id" uuid;--> statement-breakpoint
ALTER TABLE "rack_locations" ADD CONSTRAINT "rack_locations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rack_locations" ADD CONSTRAINT "rack_locations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rack_locations_business" ON "rack_locations" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_rack_locations_warehouse" ON "rack_locations" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "idx_warehouses_business" ON "warehouses" USING btree ("business_id");--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_rack_location_id_fkey" FOREIGN KEY ("rack_location_id") REFERENCES "public"."rack_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_source_warehouse_id_fkey" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_target_warehouse_id_fkey" FOREIGN KEY ("target_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_source_rack_location_id_fkey" FOREIGN KEY ("source_rack_location_id") REFERENCES "public"."rack_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_target_rack_location_id_fkey" FOREIGN KEY ("target_rack_location_id") REFERENCES "public"."rack_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_batches_warehouse" ON "product_batches" USING btree ("warehouse_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_batches_rack" ON "product_batches" USING btree ("rack_location_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_movements_src_wh" ON "stock_movements" USING btree ("source_warehouse_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_movements_tgt_wh" ON "stock_movements" USING btree ("target_warehouse_id" uuid_ops);