import { describe, expect, it, vi } from "vitest";
import { createHolidayHandlers } from "./holiday.handlers";

describe("REST holiday handlers", () => {
	it("creates a holiday for the authenticated business", async () => {
		const create = vi.fn().mockResolvedValue({ id: "holiday-1" });
		const handlers = createHolidayHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			list: vi.fn(),
			create,
			delete: vi.fn(),
		});

		const response = await handlers.create(
			new Request("https://pet-store.test/api/v1/admin/branch-holidays", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					branchId: "branch-1",
					name: "Holiday",
					date: "2026-12-25",
				}),
			}),
			"holiday-request",
		);

		expect(response.status).toBe(201);
		expect(create).toHaveBeenCalledWith("business-1", {
			branchId: "branch-1",
			name: "Holiday",
			date: "2026-12-25",
		});
	});
});
