import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
	resolve(
		process.cwd(),
		"src/infra/db/drizzle/migrations/0015_portal_booking_boarding.sql",
	),
	"utf8",
);

describe("portal booking boarding migration", () => {
	it("persists a required tenant-scoped idempotency key", () => {
		expect(migration).toContain('ADD COLUMN "idempotency_key" text');
		expect(migration).toContain('ALTER COLUMN "idempotency_key" SET NOT NULL');
		expect(migration).toContain(
			'ON "portal_bookings" ("business_id", "idempotency_key")',
		);
	});
});
