import { Effect } from "effect";
import { InvoiceValidationError } from "./invoice.errors";
import type { TInvoiceStatus } from "./invoice.types";

export const InvoiceModule = {
	generateInvoiceNumber: (): string => {
		const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
		const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
		return `INV-${dateStr}-${randomStr}`;
	},

	calculatePaymentStatus: (
		totalAmount: number,
		amountPaid: number,
	): TInvoiceStatus => {
		if (amountPaid <= 0) return "unpaid";
		if (amountPaid >= totalAmount) return "paid";
		return "partial";
	},

	validatePaymentAmount: (
		totalAmount: number,
		amountPaid: number,
		paymentAmount: number,
	): Effect.Effect<number, InvoiceValidationError> => {
		if (paymentAmount <= 0) {
			return Effect.fail(
				new InvoiceValidationError({
					message: "Jumlah pembayaran harus lebih dari 0",
				}),
			);
		}
		const newAmountPaid = amountPaid + paymentAmount;
		if (newAmountPaid > totalAmount) {
			return Effect.fail(
				new InvoiceValidationError({
					message: "Jumlah pembayaran melebihi total tagihan",
				}),
			);
		}
		return Effect.succeed(newAmountPaid);
	},

	reconstitute: <T>(raw: T): T => ({ ...raw }),
} as const;
