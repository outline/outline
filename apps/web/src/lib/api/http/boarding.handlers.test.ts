import { describe, expect, it, vi } from "vitest";
import { createBoardingHandlers } from "./boarding.handlers";

describe("REST boarding handlers", () => {
	it("creates a boarding for the authenticated user", async () => {
		const create = vi.fn().mockResolvedValue({ id: "boarding-1" });
		const handlers = createBoardingHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			list: vi.fn(),
			create,
			updateStatus: vi.fn(),
		});

		const response = await handlers.create(
			new Request("https://pet-store.test/api/v1/admin/boardings", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ branchId: "branch-1", pets: [] }),
			}),
			"boarding-request",
		);

		expect(response.status).toBe(201);
		expect(create).toHaveBeenCalledWith("business-1", "user-1", {
			branchId: "branch-1",
			pets: [],
		});
	});

	it("updates boarding status for the authenticated business", async () => {
		const updateStatus = vi.fn().mockResolvedValue(undefined);
		const handlers = createBoardingHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			list: vi.fn(),
			create: vi.fn(),
			updateStatus,
		});
		const response = await handlers.updateStatus(
			new Request("https://pet-store.test/api/v1/admin/boardings/b-1/status", {
				method: "PATCH",
				headers: { Cookie: "session_token=token-1" },
				body: JSON.stringify({ status: "completed" }),
			}),
			"boarding-request",
			"b-1",
		);
		expect(response.status).toBe(200);
		expect(updateStatus).toHaveBeenCalledWith("business-1", "b-1", "completed");
	});
});
