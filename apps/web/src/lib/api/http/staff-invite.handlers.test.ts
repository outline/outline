import { describe, expect, it, vi } from "vitest";
import { createStaffInviteHandlers } from "./staff-invite.handlers";

describe("REST staff invite handlers", () => {
	it("grants access for the authenticated business", async () => {
		const invite = vi.fn().mockResolvedValue({ sent: true });
		const handlers = createStaffInviteHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			invite,
		});
		const response = await handlers.invite(
			new Request("https://pet-store.test/api/v1/admin/staff/invite", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email: "staff@example.com" }),
			}),
			"staff-request",
		);
		expect(response.status).toBe(200);
		expect(invite).toHaveBeenCalledWith("business-1", {
			email: "staff@example.com",
		});
	});
});
