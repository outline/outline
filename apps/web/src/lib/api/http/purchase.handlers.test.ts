import { describe, expect, it, vi } from "vitest";
import { createPurchaseHandlers } from "./purchase.handlers";

describe("REST purchase handlers", () => {
	it("lists purchase orders for the authenticated business", async () => {
		const list = vi.fn().mockResolvedValue([{ id: "po-1" }]);
		const handlers = createPurchaseHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				userId: "user-1",
			}),
			list,
			create: vi.fn(),
			updateStatus: vi.fn(),
			receive: vi.fn(),
		});

		const response = await handlers.list(
			new Request("https://pet-store.test/api/v1/admin/purchase-orders", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"purchase-request",
		);

		expect(response.status).toBe(200);
		expect(list).toHaveBeenCalledWith("business-1");
	});
});
