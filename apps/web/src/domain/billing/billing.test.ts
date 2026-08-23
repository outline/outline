import { describe, expect, it } from "vitest";
import { BillingModule } from "./billing.module";

describe("BillingModule", () => {
	describe("calculateAmount", () => {
		it("should calculate monthly pro amount correctly", () => {
			const amount = BillingModule.calculateAmount("pro", "monthly");
			expect(amount).toBe(199000);
		});

		it("should calculate annual pro amount with discount", () => {
			const monthly = BillingModule.calculateAmount("pro", "monthly");
			const annual = BillingModule.calculateAmount("pro", "yearly");
			expect(annual).toBe(1990000);
			expect(annual).toBeLessThan(monthly * 12);
		});

		it("should return 0 for free plan", () => {
			expect(BillingModule.calculateAmount("free", "monthly")).toBe(0);
		});
	});

	describe("calculateNextPeriodEnd", () => {
		it("should calculate monthly end date correctly", () => {
			const start = new Date("2026-06-08");
			const end = BillingModule.calculateNextPeriodEnd(start, "monthly");
			expect(end.getMonth()).toBe(6); // July
			expect(end.getDate()).toBe(8);
		});

		it("should calculate yearly end date correctly", () => {
			const start = new Date("2026-06-08");
			const end = BillingModule.calculateNextPeriodEnd(start, "yearly");
			expect(end.getFullYear()).toBe(2027);
		});
	});
});
