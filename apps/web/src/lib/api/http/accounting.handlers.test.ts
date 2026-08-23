import { describe, expect, it, vi } from "vitest";
import { createAccountingHandlers } from "./accounting.handlers";

describe("REST accounting handlers", () => {
	it("returns dashboard metrics for the authenticated business", async () => {
		const dashboardMetrics = vi.fn().mockResolvedValue({ revenueToday: 100 });
		const handlers = createAccountingHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			dashboardMetrics,
		});

		const response = await handlers.dashboardMetrics(
			new Request(
				"https://pet-store.test/api/v1/admin/accounting/dashboard-metrics",
				{
					headers: { Cookie: "session_token=token-1" },
				},
			),
			"accounting-request",
		);

		expect(response.status).toBe(200);
		expect(dashboardMetrics).toHaveBeenCalledWith("business-1");
	});
});
