import { describe, expect, it, vi } from "vitest";
import { createAccountingReportHandlers } from "./accounting-report.handlers";

describe("REST accounting report handlers", () => {
	it("returns cash flow for the authenticated business", async () => {
		const cashFlow = vi.fn().mockResolvedValue({ netCashFlow: 10 });
		const handlers = createAccountingReportHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			cashFlow,
			commissions: vi.fn(),
		});

		const response = await handlers.cashFlow(
			new Request("https://pet-store.test/api/v1/admin/accounting/cash-flow", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"report-request",
		);

		expect(response.status).toBe(200);
		expect(cashFlow).toHaveBeenCalledWith("business-1");
	});
});
