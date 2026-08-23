import { describe, expect, it } from "vitest";
import { generateId } from "./id";

describe("generateId", () => {
	it("should generate a non-empty string", () => {
		const id = generateId();
		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);
	});

	it("should generate unique identifiers", () => {
		const id1 = generateId();
		const id2 = generateId();
		expect(id1).not.toBe(id2);
	});

	it("should follow UUID format", () => {
		const id = generateId();
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		expect(id).toMatch(uuidRegex);
	});
});
