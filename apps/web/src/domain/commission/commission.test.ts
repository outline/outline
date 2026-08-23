import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	createCommissionRule,
	createKasbon,
	createKasbonPayment,
	updateCommissionRuleData,
} from "./commission.module";

describe("CommissionModule", () => {
	const tenantId = generateId<TTenantId>();

	describe("createCommissionRule", () => {
		it("should create a commission rule with isActive=true", () => {
			const data = {
				staffId: "staff-1",
				model: "percentage" as const,
				ratePercent: 10,
				rateFixed: 0,
				rateSmall: 0,
				rateMedium: 0,
				rateLarge: 0,
				rateXl: 0,
				includeAddons: true,
			};

			const result = Effect.runSync(createCommissionRule(tenantId, data));

			expect(result.tenantId).toBe(tenantId);
			expect(result.staffId).toBe("staff-1");
			expect(result.model).toBe("percentage");
			expect(result.ratePercent).toBe(10);
			expect(result.isActive).toBe(true);
			expect(result.includeAddons).toBe(true);
		});

		it("should create a fixed model commission rule", () => {
			const data = {
				staffId: "staff-2",
				model: "fixed" as const,
				ratePercent: 0,
				rateFixed: 25000,
				rateSmall: 0,
				rateMedium: 0,
				rateLarge: 0,
				rateXl: 0,
				includeAddons: false,
			};

			const result = Effect.runSync(createCommissionRule(tenantId, data));

			expect(result.model).toBe("fixed");
			expect(result.rateFixed).toBe(25000);
			expect(result.includeAddons).toBe(false);
		});

		it("should create a size_tier model commission rule", () => {
			const data = {
				staffId: "staff-3",
				model: "size_tier" as const,
				ratePercent: 0,
				rateFixed: 0,
				rateSmall: 10000,
				rateMedium: 15000,
				rateLarge: 20000,
				rateXl: 25000,
				includeAddons: true,
			};

			const result = Effect.runSync(createCommissionRule(tenantId, data));

			expect(result.model).toBe("size_tier");
			expect(result.rateSmall).toBe(10000);
			expect(result.rateMedium).toBe(15000);
			expect(result.rateLarge).toBe(20000);
			expect(result.rateXl).toBe(25000);
		});
	});

	describe("updateCommissionRuleData", () => {
		it("should only include defined fields in updates", () => {
			const result = Effect.runSync(
				updateCommissionRuleData({
					id: "rule-1",
					ratePercent: 15,
					includeAddons: false,
				}),
			);

			expect(result.ratePercent).toBe(15);
			expect(result.includeAddons).toBe(false);
			expect(result.model).toBeUndefined();
			expect(result.rateFixed).toBeUndefined();
			expect(result.isActive).toBeUndefined();
		});

		it("should handle boolean false values correctly", () => {
			const result = Effect.runSync(
				updateCommissionRuleData({
					id: "rule-1",
					isActive: false,
				}),
			);

			expect(result.isActive).toBe(false);
		});

		it("should return empty object when no fields provided", () => {
			const result = Effect.runSync(updateCommissionRuleData({ id: "rule-1" }));

			expect(Object.keys(result)).toHaveLength(0);
		});
	});

	describe("createKasbon", () => {
		it("should create a kasbon with correct fields", () => {
			const data = {
				staffId: "staff-1",
				amount: 500000,
				installmentAmount: 100000,
				notes: "Emergency advance",
			};

			const result = Effect.runSync(createKasbon(tenantId, data));

			expect(result.tenantId).toBe(tenantId);
			expect(result.staffId).toBe("staff-1");
			expect(result.amount).toBe(500000);
			expect(result.installmentAmount).toBe(100000);
			expect(result.notes).toBe("Emergency advance");
		});

		it("should handle null notes", () => {
			const data = {
				staffId: "staff-2",
				amount: 300000,
				installmentAmount: 50000,
				notes: null,
			};

			const result = Effect.runSync(createKasbon(tenantId, data));

			expect(result.notes).toBeNull();
		});
	});

	describe("createKasbonPayment", () => {
		it("should create a payment with manual source", () => {
			const data = {
				kasbonId: "kasbon-1",
				amount: 100000,
				source: "manual" as const,
			};

			const result = Effect.runSync(createKasbonPayment(data));

			expect(result.kasbonId).toBe("kasbon-1");
			expect(result.amount).toBe(100000);
			expect(result.source).toBe("manual");
		});

		it("should create a payment with commission_deduction source", () => {
			const data = {
				kasbonId: "kasbon-2",
				amount: 50000,
				source: "commission_deduction" as const,
			};

			const result = Effect.runSync(createKasbonPayment(data));

			expect(result.source).toBe("commission_deduction");
		});
	});
});
