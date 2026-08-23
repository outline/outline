import { describe, expect, it, vi } from "vitest";
import { createAdvanceHandlers } from "./advance.handlers";

describe("REST advance handlers", () => {
	it("returns advances for the authenticated business", async () => {
		const list = vi.fn().mockResolvedValue([{ id: "advance-1" }]);
		const handlers = createAdvanceHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list,
		});
		const response = await handlers.list(
			new Request("https://pet-store.test/api/v1/admin/advances", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"advance-request",
		);
		expect(response.status).toBe(200);
		expect(list).toHaveBeenCalledWith("business-1");
	});
});
