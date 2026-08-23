ALTER TABLE "note_collections" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_note_collections_business_sort" ON "note_collections" USING btree ("business_id", "sort_order");
