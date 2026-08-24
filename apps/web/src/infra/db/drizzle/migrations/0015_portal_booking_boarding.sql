ALTER TABLE "portal_bookings"
	ADD COLUMN "room_id" uuid,
	ADD COLUMN "boarding_id" uuid,
	ADD COLUMN "estimated_check_out_at" timestamp with time zone,
	ADD COLUMN "idempotency_key" text;

UPDATE "portal_bookings"
	SET "idempotency_key" = 'legacy:' || "id"::text
	WHERE "idempotency_key" IS NULL;

ALTER TABLE "portal_bookings"
	ALTER COLUMN "idempotency_key" SET NOT NULL;

ALTER TABLE "portal_bookings"
	ADD CONSTRAINT "portal_bookings_room_id_fkey"
	FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT;

ALTER TABLE "portal_bookings"
	ADD CONSTRAINT "portal_bookings_boarding_id_fkey"
	FOREIGN KEY ("boarding_id") REFERENCES "boardings"("id") ON DELETE SET NULL;

CREATE INDEX "idx_portal_bookings_room" ON "portal_bookings" ("room_id");
CREATE UNIQUE INDEX "portal_bookings_business_id_idempotency_key"
	ON "portal_bookings" ("business_id", "idempotency_key");
CREATE UNIQUE INDEX "portal_bookings_boarding_id_key"
	ON "portal_bookings" ("boarding_id")
	WHERE "boarding_id" IS NOT NULL;
