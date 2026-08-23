import { describe, expect, it, vi } from "vitest";
import { createStaffProfileHandlers } from "./staff-profile.handlers";

describe("REST staff profile handlers", () => {
	it("passes the commission rate through to the profile update", async () => {
		const update = vi.fn().mockResolvedValue(true);
		const handlers = createStaffProfileHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			update,
		});

		const response = await handlers.update(
			new Request("https://pet-store.test/api/v1/admin/staff/staff-1/profile", {
				method: "PATCH",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					fullName: "Ari",
					email: "ari@example.com",
					commissionRate: 7.5,
				}),
			}),
			"staff-request",
			"staff-1",
		);

		expect(response.status).toBe(200);
		expect(update).toHaveBeenCalledWith(
			"business-1",
			"staff-1",
			{ fullName: "Ari", email: "ari@example.com" },
			7.5,
		);
	});
});
