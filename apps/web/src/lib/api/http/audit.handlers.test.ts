import { describe, expect, it, vi } from "vitest";
import { createAuditHandlers } from "./audit.handlers";

describe("REST audit handlers", () => {
	it("returns audit logs for the authenticated business", async () => {
		const list = vi.fn().mockResolvedValue([{ id: "audit-1" }]);
		const handlers = createAuditHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list,
		});

		const response = await handlers.list(
			new Request("https://pet-store.test/api/v1/admin/audit", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"audit-request",
		);

		expect(response.status).toBe(200);
		expect(list).toHaveBeenCalledWith("business-1");
	});
});
