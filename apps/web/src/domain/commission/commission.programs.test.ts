import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { KasbonNotFoundError } from "./commission.errors";
import {
	addCommissionRuleProgram,
	addKasbonProgram,
	getCommissionRuleByStaffProgram,
	getKasbonByStaffProgram,
	payCommissionsProgram,
	payKasbonProgram,
	updateCommissionRuleProgram,
} from "./commission.programs";
import { CommissionRepository } from "./commission.repository";
import type {
	TCommissionRule,
	TCommissionRuleId,
	TKasbon,
	TKasbonId,
	TKasbonPayment,
	TKasbonPaymentId,
} from "./commission.types";

describe("CommissionPrograms", () => {
	const tenantId = generateId<TTenantId>();
	const staffId = generateId<TStaffId>();

	describe("getCommissionRuleByStaffProgram", () => {
		it("should call findRuleByStaffId and return the rule", async () => {
			const rule: TCommissionRule = {
				id: "rule-1" as TCommissionRuleId,
				tenantId,
				staffId,
				model: "percentage",
				ratePercent: 10,
				rateFixed: 0,
				rateSmall: 0,
				rateMedium: 0,
				rateLarge: 0,
				rateXl: 0,
				includeAddons: true,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const findRuleByStaffId = vi.fn().mockReturnValue(Effect.succeed(rule));
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId,
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment: vi.fn(),
			});

			const program = getCommissionRuleByStaffProgram(tenantId, staffId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result).toEqual(rule);
			expect(findRuleByStaffId).toHaveBeenCalledWith(staffId, tenantId);
		});

		it("should return null when no rule exists", async () => {
			const findRuleByStaffId = vi.fn().mockReturnValue(Effect.succeed(null));
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId,
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment: vi.fn(),
			});

			const program = getCommissionRuleByStaffProgram(tenantId, staffId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result).toBeNull();
		});

		it("should propagate DatabaseError", async () => {
			const findRuleByStaffId = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId,
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment: vi.fn(),
			});

			const program = getCommissionRuleByStaffProgram(tenantId, staffId);
			await expect(
				Effect.runPromise(Effect.provide(program, TestLayer)),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("addCommissionRuleProgram", () => {
		it("should validate input, create entity, and save", async () => {
			const savedRule: TCommissionRule = {
				id: "rule-new" as TCommissionRuleId,
				tenantId,
				staffId: staffId,
				model: "percentage",
				ratePercent: 10,
				rateFixed: 0,
				rateSmall: 0,
				rateMedium: 0,
				rateLarge: 0,
				rateXl: 0,
				includeAddons: true,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const saveRule = vi.fn().mockReturnValue(Effect.succeed(savedRule));
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId: vi.fn(),
				saveRule,
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment: vi.fn(),
			});

			const data = {
				staffId,
				model: "percentage" as const,
				ratePercent: 10,
				rateFixed: 0,
				rateSmall: 0,
				rateMedium: 0,
				rateLarge: 0,
				rateXl: 0,
				includeAddons: true,
			};

			const program = addCommissionRuleProgram(tenantId, data);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result.id).toBe("rule-new");
			expect(result.model).toBe("percentage");
			expect(saveRule).toHaveBeenCalledOnce();
		});
	});

	describe("updateCommissionRuleProgram", () => {
		it("should validate input and call repo.updateRule", async () => {
			const updatedRule: TCommissionRule = {
				id: "rule-1" as TCommissionRuleId,
				tenantId,
				staffId,
				model: "percentage",
				ratePercent: 15,
				rateFixed: 0,
				rateSmall: 0,
				rateMedium: 0,
				rateLarge: 0,
				rateXl: 0,
				includeAddons: false,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const updateRule = vi.fn().mockReturnValue(Effect.succeed(updatedRule));
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId: vi.fn(),
				saveRule: vi.fn(),
				updateRule,
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment: vi.fn(),
			});

			const data = {
				id: "rule-1",
				ratePercent: 15,
				includeAddons: false,
			};

			const program = updateCommissionRuleProgram(tenantId, data);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result.ratePercent).toBe(15);
			expect(result.includeAddons).toBe(false);
			expect(updateRule).toHaveBeenCalled();
		});
	});

	describe("payCommissionsProgram", () => {
		it("should call repo.markRecordsAsPaid", async () => {
			const markRecordsAsPaid = vi.fn().mockReturnValue(Effect.void);
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId: vi.fn(),
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid,
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment: vi.fn(),
			});

			const program = payCommissionsProgram(tenantId, staffId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result).toBeUndefined();
			expect(markRecordsAsPaid).toHaveBeenCalledWith(staffId, tenantId);
		});

		it("should propagate DatabaseError", async () => {
			const markRecordsAsPaid = vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				);
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId: vi.fn(),
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid,
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment: vi.fn(),
			});

			const program = payCommissionsProgram(tenantId, staffId);
			await expect(
				Effect.runPromise(Effect.provide(program, TestLayer)),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("getKasbonByStaffProgram", () => {
		it("should call findKasbonByStaffId and return kasbons", async () => {
			const kasbons: readonly TKasbon[] = [
				{
					id: "kasbon-1" as TKasbonId,
					tenantId,
					staffId,
					amount: 500000,
					remaining: 300000,
					installmentAmount: 100000,
					notes: null,
					status: "active",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];
			const findKasbonByStaffId = vi
				.fn()
				.mockReturnValue(Effect.succeed(kasbons));
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId: vi.fn(),
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId,
				saveKasbon: vi.fn(),
				addKasbonPayment: vi.fn(),
			});

			const program = getKasbonByStaffProgram(tenantId, staffId);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.amount).toBe(500000);
			expect(result[0]?.status).toBe("active");
		});
	});

	describe("addKasbonProgram", () => {
		it("should validate input, create entity, and save", async () => {
			const savedKasbon: TKasbon = {
				id: "kasbon-new" as TKasbonId,
				tenantId,
				staffId,
				amount: 500000,
				remaining: 500000,
				installmentAmount: 100000,
				notes: "Advance",
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const saveKasbon = vi.fn().mockReturnValue(Effect.succeed(savedKasbon));
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId: vi.fn(),
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId: vi.fn(),
				saveKasbon,
				addKasbonPayment: vi.fn(),
			});

			const data = {
				staffId,
				amount: 500000,
				installmentAmount: 100000,
				notes: "Advance",
			};

			const program = addKasbonProgram(tenantId, data);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result.id).toBe("kasbon-new");
			expect(result.amount).toBe(500000);
			expect(saveKasbon).toHaveBeenCalledOnce();
		});
	});

	describe("payKasbonProgram", () => {
		it("should validate input and call addKasbonPayment", async () => {
			const payment: TKasbonPayment = {
				id: "payment-1" as TKasbonPaymentId,
				kasbonId: "kasbon-1" as TKasbonId,
				amount: 100000,
				source: "manual",
				paidAt: new Date(),
			};
			const addKasbonPayment = vi.fn().mockReturnValue(Effect.succeed(payment));
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId: vi.fn(),
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment,
			});

			const data = {
				kasbonId: "kasbon-1",
				amount: 100000,
				source: "manual" as const,
			};

			const program = payKasbonProgram(tenantId, data);
			const result = await Effect.runPromise(
				Effect.provide(program, TestLayer),
			);

			expect(result.amount).toBe(100000);
			expect(result.source).toBe("manual");
			expect(addKasbonPayment).toHaveBeenCalledOnce();
		});

		it("should propagate KasbonNotFoundError", async () => {
			const addKasbonPayment = vi
				.fn()
				.mockReturnValue(
					Effect.fail(new KasbonNotFoundError({ id: "kasbon-nonexistent" })),
				);
			const TestLayer = Layer.succeed(CommissionRepository, {
				findRuleByStaffId: vi.fn(),
				saveRule: vi.fn(),
				updateRule: vi.fn(),
				findRecordsByStaffId: vi.fn(),
				saveRecord: vi.fn(),
				markRecordsAsPaid: vi.fn(),
				findKasbonByStaffId: vi.fn(),
				saveKasbon: vi.fn(),
				addKasbonPayment,
			});

			const data = {
				kasbonId: "kasbon-nonexistent",
				amount: 50000,
				source: "manual" as const,
			};

			const program = payKasbonProgram(tenantId, data);
			await expect(
				Effect.runPromise(Effect.provide(program, TestLayer)),
			).rejects.toMatchObject({
				name: expect.stringContaining("KasbonNotFoundError"),
			});
		});
	});
});
