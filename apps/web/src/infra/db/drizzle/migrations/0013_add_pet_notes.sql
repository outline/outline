CREATE TABLE "note_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"collection_id" uuid,
	"parent_note_id" uuid,
	"created_by" uuid NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"icon" text,
	"color" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamptz,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamptz,
	"deleted_at" timestamptz,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_collections" ADD CONSTRAINT "note_collections_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "note_collections" ADD CONSTRAINT "note_collections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pet_notes" ADD CONSTRAINT "pet_notes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pet_notes" ADD CONSTRAINT "pet_notes_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."note_collections"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pet_notes" ADD CONSTRAINT "pet_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_note_collections_business" ON "note_collections" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX "idx_pet_notes_business_updated" ON "pet_notes" USING btree ("business_id", "updated_at" DESC);
--> statement-breakpoint
CREATE INDEX "idx_pet_notes_collection" ON "pet_notes" USING btree ("collection_id");
