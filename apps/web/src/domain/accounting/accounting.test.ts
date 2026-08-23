import { describe, expect, it } from "vitest";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { AccountingModule } from "./accounting.module";
import type { TExpense, TExpenseId } from "./accounting.types";

describe("AccountingModule", () => {
	describe("calculateNetProfit", () => {
		it("should calculate positive net profit", () => {
			const result = AccountingModule.calculateNetProfit(1000, 400);
			expect(result).toBe(600);
		});

		it("should return zero when revenue equals expenses", () => {
			const result = AccountingModule.calculateNetProfit(500, 500);
			expect(result).toBe(0);
		});

		it("should return negative when expenses exceed revenue (loss)", () => {
			const result = AccountingModule.calculateNetProfit(300, 500);
			expect(result).toBe(-200);
		});

		it("should handle zero revenue", () => {
			const result = AccountingModule.calculateNetProfit(0, 100);
			expect(result).toBe(-100);
		});
	});

	describe("calculateMargin", () => {
		it("should calculate positive margin percentage", () => {
			const result = AccountingModule.calculateMargin(1000, 400);
			expect(result).toBe(60);
		});

		it("should return 0 for zero revenue", () => {
			const result = AccountingModule.calculateMargin(0, 400);
			expect(result).toBe(0);
		});

		it("should return 100 when there are no expenses", () => {
			const result = AccountingModule.calculateMargin(500, 0);
			expect(result).toBe(100);
		});

		it("should return negative margin when expenses exceed revenue", () => {
			const result = AccountingModule.calculateMargin(500, 600);
			expect(result).toBe(-20);
		});

		it("should handle fractional margins", () => {
			const result = AccountingModule.calculateMargin(1000, 333);
			expect(result).toBeCloseTo(66.7, 1);
		});
	});

	describe("reconstituteExpense", () => {
		it("should return the same expense object", () => {
			const expense: TExpense = {
				id: "exp-123" as TExpenseId,
				tenantId: "business-1" as TTenantId,
				branchId: "branch-1" as TBranchId,
				category: "Food",
				description: "Pet food supplies",
				amount: 50000,
				expenseDate: new Date("2026-06-01"),
				paymentMethod: "cash",
				receiptUrl: null,
				notes: null,
				createdBy: "user-1" as TUserId,
			};
			const result = AccountingModule.reconstituteExpense(expense);
			expect(result).toEqual(expense);
		});

		it("should preserve null fields", () => {
			const expense: TExpense = {
				id: "exp-456" as TExpenseId,
				tenantId: "business-1" as TTenantId,
				branchId: null,
				category: "Utilities",
				description: "Electricity bill",
				amount: 100000,
				expenseDate: new Date("2026-06-15"),
				paymentMethod: "transfer",
				receiptUrl: "https://receipts.example.com/elec.pdf",
				notes: "Paid on time",
				createdBy: "user-2" as TUserId,
			};
			const result = AccountingModule.reconstituteExpense(expense);
			expect(result.branchId).toBeNull();
			expect(result.receiptUrl).toBe("https://receipts.example.com/elec.pdf");
			expect(result.notes).toBe("Paid on time");
		});
	});
});
