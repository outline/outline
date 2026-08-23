import { describe, expect, it, vi } from "vitest";
import { createLoyaltyHandlers } from "./loyalty.handlers";

describe("REST loyalty handlers", () => {
	it("loads loyalty config for the authenticated business", async () => {
		const config = vi.fn().mockResolvedValue({ isActive: true });
		const handlers = createLoyaltyHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			config,
			updateConfig: vi.fn(),
			redeem: vi.fn(),
		});

		const response = await handlers.config(
			new Request("https://pet-store.test/api/v1/admin/loyalty/config", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"loyalty-request",
		);

		expect(response.status).toBe(200);
		expect(config).toHaveBeenCalledWith("business-1");
	});
});
