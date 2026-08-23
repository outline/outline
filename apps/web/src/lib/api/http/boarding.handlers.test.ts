import { describe, expect, it, vi } from "vitest";
import { createBoardingHandlers } from "./boarding.handlers";

describe("REST boarding handlers", () => {
	it("updates boarding status for the authenticated business", async () => {
		const updateStatus = vi.fn().mockResolvedValue(undefined);
		const handlers = createBoardingHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list: vi.fn(),
			updateStatus,
		});

		const response = await handlers.updateStatus(
			new Request(
				"https://pet-store.test/api/v1/admin/boardings/boarding-1/status",
				{
					method: "PATCH",
					headers: {
						Cookie: "session_token=token-1",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: "completed" }),
				},
			),
			"boarding-request",
			"boarding-1",
		);

		expect(response.status).toBe(200);
		expect(updateStatus).toHaveBeenCalledWith(
			"business-1",
			"boarding-1",
			"completed",
		);
	});
});
