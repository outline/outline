import { describe, expect, it } from "vitest";
import {
	calculateGlobalDiscountAmount,
	calculateItemDiscountAmount,
	calculateSubtotal,
	calculateTotalAmount,
} from "./pos.utils";

describe("POS Utils", () => {
	describe("calculateItemDiscountAmount", () => {
		it("should return 0 if no discount", () => {
			expect(calculateItemDiscountAmount(1000, 2, null, 0)).toBe(0);
		});

		it("should calculate fixed discount correctly", () => {
			// Fixed discount is per item (actually in usePOSCart it was applied as a flat value per cart item, let's verify)
			expect(calculateItemDiscountAmount(1000, 2, "fixed", 500)).toBe(500);
		});

		it("should calculate percentage discount correctly based on price * qty", () => {
			expect(calculateItemDiscountAmount(1000, 2, "percentage", 10)).toBe(200);
		});
	});

	describe("calculateSubtotal", () => {
		it("should calculate subtotal correctly", () => {
			const items = [
				{ price: 1000, cartQuantity: 2, discountAmount: 200 }, // 2000 - 200 = 1800
				{ price: 5000, cartQuantity: 1, discountAmount: 500 }, // 5000 - 500 = 4500
			];
			expect(calculateSubtotal(items)).toBe(6300);
		});

		it("should return 0 for empty cart", () => {
			expect(calculateSubtotal([])).toBe(0);
		});
	});

	describe("calculateGlobalDiscountAmount", () => {
		it("should calculate fixed global discount correctly", () => {
			expect(calculateGlobalDiscountAmount(6300, "fixed", 1000)).toBe(1000);
		});

		it("should calculate percentage global discount correctly", () => {
			expect(calculateGlobalDiscountAmount(6300, "percentage", 10)).toBe(630);
		});
	});

	describe("calculateTotalAmount", () => {
		it("should return correct total", () => {
			expect(calculateTotalAmount(6300, 1300)).toBe(5000);
		});

		it("should not return negative total", () => {
			expect(calculateTotalAmount(1000, 2000)).toBe(0);
		});
	});
});
