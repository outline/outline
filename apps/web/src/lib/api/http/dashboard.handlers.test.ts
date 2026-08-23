import { describe, expect, it, vi } from "vitest";
import { createDashboardHandlers } from "./dashboard.handlers";

describe("REST dashboard handlers", () => {
	it("returns top sellers for the authenticated business", async () => {
		const topSellers = vi.fn().mockResolvedValue([{ name: "Food" }]);
		const handlers = createDashboardHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			topSellers,
		});

		const response = await handlers.topSellers(
			new Request("https://pet-store.test/api/v1/admin/dashboard/top-sellers", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"dashboard-request",
		);

		expect(response.status).toBe(200);
		expect(topSellers).toHaveBeenCalledWith("business-1");
	});
});
