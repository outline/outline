import { describe, expect, it, vi } from "vitest";
import { createRoomHandlers } from "./room.handlers";

describe("REST room handlers", () => {
	it("lists rooms for the authenticated business and branch", async () => {
		const list = vi.fn().mockResolvedValue([{ id: "room-1" }]);
		const handlers = createRoomHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list,
			mutate: vi.fn(),
		});

		const response = await handlers.list(
			new Request(
				"https://pet-store.test/api/v1/admin/rooms?branchId=branch-1",
				{ headers: { Cookie: "session_token=token-1" } },
			),
			"room-request",
		);

		expect(response.status).toBe(200);
		expect(list).toHaveBeenCalledWith("business-1", "branch-1");
	});
});
