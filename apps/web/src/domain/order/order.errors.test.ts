import { describe, expect, it } from "vitest";
import { parseInsufficientStockError } from "./order.errors";

describe("parseInsufficientStockError", () => {
	const variantId = "7d5a1c8e-3f2b-4a6d-9e0f-1b2c3d4e5f60";

	it("parses a Neon/Postgres-style error object", () => {
		const error = {
			message: `INSUFFICIENT_STOCK|${variantId}|5|3`,
			code: "P0001",
		};

		const result = parseInsufficientStockError(error);

		expect(result?._tag).toBe("InsufficientStockError");
		expect(result?.productId).toBe(variantId);
		expect(result?.requested).toBe(5);
		expect(result?.available).toBe(3);
	});

	it("parses an Error instance with surrounding text", () => {
		const error = new Error(
			`unexpected: INSUFFICIENT_STOCK|${variantId}|2|0 (SQLSTATE P0001)`,
		);

		const result = parseInsufficientStockError(error);

		expect(result?.requested).toBe(2);
		expect(result?.available).toBe(0);
	});

	it("returns null for unrelated errors", () => {
		expect(parseInsufficientStockError(new Error("duplicate key"))).toBeNull();
		expect(parseInsufficientStockError({ message: "network down" })).toBeNull();
		expect(parseInsufficientStockError(undefined)).toBeNull();
	});
});
