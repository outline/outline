import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
	resolve(
		process.cwd(),
		"src/infra/db/drizzle/migrations/0016_enforce_subscription_limits.sql",
	),
	"utf8",
);

describe("subscription limit migration", () => {
	it("counts only active branches and enforces branch reactivation", () => {
		expect(migration).toContain("AND is_active = true");
		expect(migration).toContain(
			"BEFORE INSERT OR UPDATE OF is_active ON branches",
		);
	});

	it("enforces active profile inserts and reactivation without double counting", () => {
		expect(migration).toContain("JOIN profiles");
		expect(migration).toContain("IF NOT NEW.is_active THEN");
		expect(migration).toContain("AND p.id <> NEW.id");
		expect(migration).toContain(
			"BEFORE INSERT OR UPDATE OF is_active ON profiles",
		);
	});
});
