import { describe, expect, it } from "vitest";
import { formatCurrency, formatNumber } from "./format";

describe("Format Utils", () => {
	describe("formatCurrency", () => {
		it("should format IDR correctly", () => {
			expect(formatCurrency(150000, "id")).toContain("Rp");
			expect(formatCurrency(150000, "id")).toContain("150.000");
		});

		it("should format USD correctly", () => {
			expect(formatCurrency(100, "en")).toContain("$");
			expect(formatCurrency(100, "en")).toContain("100.00");
		});
	});

	describe("formatNumber", () => {
		it("should format numbers with locale separators", () => {
			expect(formatNumber(1250500, "id")).toBe("1.250.500");
			expect(formatNumber(1250500, "en")).toBe("1,250,500");
		});
	});
});
