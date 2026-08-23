import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { InvoiceModule } from "./invoice.module";

describe("InvoiceModule", () => {
	describe("generateInvoiceNumber", () => {
		it("should generate an invoice number with correct format", () => {
			const result = InvoiceModule.generateInvoiceNumber();
			// Format: INV-YYYYMMDD-XXXX
			expect(result).toMatch(/^INV-\d{8}-[A-Z0-9]{4}$/);
		});

		it("should generate unique invoice numbers", () => {
			const numbers = new Set(
				Array.from({ length: 10 }, () => InvoiceModule.generateInvoiceNumber()),
			);
			expect(numbers.size).toBe(10);
		});

		it("should include today's date", () => {
			const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
			const result = InvoiceModule.generateInvoiceNumber();
			expect(result).toContain(dateStr);
		});
	});

	describe("calculatePaymentStatus", () => {
		it("should return 'unpaid' when amountPaid is 0", () => {
			expect(InvoiceModule.calculatePaymentStatus(100000, 0)).toBe("unpaid");
		});

		it("should return 'unpaid' when amountPaid is negative", () => {
			expect(InvoiceModule.calculatePaymentStatus(100000, -500)).toBe("unpaid");
		});

		it("should return 'paid' when amountPaid equals totalAmount", () => {
			expect(InvoiceModule.calculatePaymentStatus(100000, 100000)).toBe("paid");
		});

		it("should return 'paid' when amountPaid exceeds totalAmount", () => {
			expect(InvoiceModule.calculatePaymentStatus(100000, 150000)).toBe("paid");
		});

		it("should return 'partial' when amountPaid is between 0 and totalAmount", () => {
			expect(InvoiceModule.calculatePaymentStatus(100000, 50000)).toBe(
				"partial",
			);
			expect(InvoiceModule.calculatePaymentStatus(100000, 99999)).toBe(
				"partial",
			);
			expect(InvoiceModule.calculatePaymentStatus(100000, 1)).toBe("partial");
		});

		it("should handle zero total", () => {
			expect(InvoiceModule.calculatePaymentStatus(0, 0)).toBe("unpaid");
			expect(InvoiceModule.calculatePaymentStatus(0, -1)).toBe("unpaid");
		});
	});

	describe("validatePaymentAmount", () => {
		it("should succeed when payment amount is valid", () => {
			const result = Effect.runSync(
				InvoiceModule.validatePaymentAmount(100000, 30000, 20000),
			);
			expect(result).toBe(50000);
		});

		it("should succeed with full payment", () => {
			const result = Effect.runSync(
				InvoiceModule.validatePaymentAmount(100000, 0, 100000),
			);
			expect(result).toBe(100000);
		});

		it("should fail when payment amount is zero", () => {
			const result = Effect.runSyncExit(
				InvoiceModule.validatePaymentAmount(100000, 0, 0),
			);
			expect(result._tag).toBe("Failure");
		});

		it("should fail when payment amount is negative", () => {
			const result = Effect.runSyncExit(
				InvoiceModule.validatePaymentAmount(100000, 0, -5000),
			);
			expect(result._tag).toBe("Failure");
		});

		it("should fail when payment exceeds remaining balance", () => {
			const result = Effect.runSyncExit(
				InvoiceModule.validatePaymentAmount(100000, 50000, 60000),
			);
			expect(result._tag).toBe("Failure");
		});

		it("should fail when paying already fully paid invoice", () => {
			const result = Effect.runSyncExit(
				InvoiceModule.validatePaymentAmount(100000, 100000, 1),
			);
			expect(result._tag).toBe("Failure");
		});
	});

	describe("reconstitute", () => {
		it("should return a shallow copy of the input", () => {
			const raw = { id: "inv-1", totalAmount: 50000 };
			const result = InvoiceModule.reconstitute(raw);
			expect(result).toEqual(raw);
			expect(result).not.toBe(raw);
		});

		it("should work with arrays", () => {
			const items = [{ id: "1" }, { id: "2" }];
			const result = InvoiceModule.reconstitute(items);
			expect(result).toEqual({ "0": { id: "1" }, "1": { id: "2" } });
		});
	});
});
