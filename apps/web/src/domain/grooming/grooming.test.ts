import { describe, expect, it } from "vitest";
import { calculateBasePrice, calculateEndTime } from "./grooming.module";
import type { TGroomingService, TPetSize } from "./grooming.types";

describe("GroomingModule", () => {
	const makeService = (
		overrides: Partial<TGroomingService> = {},
	): TGroomingService => ({
		id: "svc-1" as TGroomingService["id"],
		tenantId: "tenant-1" as TGroomingService["tenantId"],
		name: "Full Grooming",
		description: null,
		durationMinutes: 60,
		priceSmall: 50000,
		priceMedium: 75000,
		priceLarge: 100000,
		priceXl: 125000,
		isActive: true,
		sortOrder: 1,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});

	describe("calculateBasePrice", () => {
		it.each<{ size: TPetSize; expected: number }>([
			{ size: "small", expected: 50000 },
			{ size: "medium", expected: 75000 },
			{ size: "large", expected: 100000 },
			{ size: "xl", expected: 125000 },
		])("should return $expected for $size pets", ({ size, expected }) => {
			const service = makeService();
			expect(calculateBasePrice(service, size)).toBe(expected);
		});

		it("should fallback to medium price for unknown size", () => {
			const service = makeService();
			const result = calculateBasePrice(service, "unknown" as TPetSize);
			expect(result).toBe(75000);
		});

		it("should handle zero prices", () => {
			const service = makeService({
				priceSmall: 0,
				priceMedium: 0,
				priceLarge: 0,
				priceXl: 0,
			});
			expect(calculateBasePrice(service, "small")).toBe(0);
			expect(calculateBasePrice(service, "large")).toBe(0);
		});
	});

	describe("calculateEndTime", () => {
		it("should add duration to start time", () => {
			const start = new Date("2026-06-20T10:00:00Z");
			const result = calculateEndTime(start, 90);
			expect(result.toISOString()).toBe("2026-06-20T11:30:00.000Z");
		});

		it("should handle zero duration", () => {
			const start = new Date("2026-06-20T10:00:00");
			const result = calculateEndTime(start, 0);
			expect(result.toISOString()).toBe(start.toISOString());
		});

		it("should not mutate the input date", () => {
			const start = new Date("2026-06-20T10:00:00");
			const startISO = start.toISOString();
			calculateEndTime(start, 30);
			expect(start.toISOString()).toBe(startISO);
		});
	});
});
