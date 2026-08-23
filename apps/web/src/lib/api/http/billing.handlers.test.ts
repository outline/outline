import { describe, expect, it, vi } from "vitest";
import { createBillingHandlers } from "./billing.handlers";

describe("REST billing handlers", () => {
	it("returns the billing summary for the authenticated business", async () => {
		const get = vi.fn().mockResolvedValue({ usage: { products: 1 } });
		const handlers = createBillingHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			get,
		});
		const response = await handlers.get(
			new Request("https://pet-store.test/api/v1/admin/billing", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"billing-request",
		);
		expect(response.status).toBe(200);
		expect(get).toHaveBeenCalledWith("business-1");
	});
});
