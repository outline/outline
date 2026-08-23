import { describe, expect, it, vi } from "vitest";
import { createStaffStatusHandlers } from "./staff-status.handlers";

describe("REST staff status handlers", () => {
	it("updates active status for the authenticated business", async () => {
		const setStatus = vi.fn().mockResolvedValue(true);
		const handlers = createStaffStatusHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			setStatus,
		});
		const response = await handlers.setStatus(
			new Request("https://pet-store.test/api/v1/admin/staff/staff-1/status", {
				method: "PATCH",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ isActive: false }),
			}),
			"staff-status-request",
			"staff-1",
		);
		expect(response.status).toBe(200);
		expect(setStatus).toHaveBeenCalledWith("business-1", "staff-1", false);
	});
});
