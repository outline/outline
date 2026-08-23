import { describe, expect, it, vi } from "vitest";
import { createInvoiceHandlers } from "./invoice.handlers";

describe("REST invoice handlers", () => {
	it("records a payment for the authenticated business", async () => {
		const payment = vi.fn().mockResolvedValue({ id: "invoice-1" });
		const handlers = createInvoiceHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list: vi.fn(),
			create: vi.fn(),
			payment,
			void: vi.fn(),
		});

		const response = await handlers.payment(
			new Request(
				"https://pet-store.test/api/v1/admin/invoices/invoice-1/payment",
				{
					method: "POST",
					headers: {
						Cookie: "session_token=token-1",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ amount: 100, method: "cash" }),
				},
			),
			"invoice-request",
			"invoice-1",
		);

		expect(response.status).toBe(200);
		expect(payment).toHaveBeenCalledWith("business-1", "invoice-1", {
			amount: 100,
			method: "cash",
		});
	});
});
