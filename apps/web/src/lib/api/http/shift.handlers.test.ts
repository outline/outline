import { describe, expect, it, vi } from "vitest";
import { createShiftHandlers } from "./shift.handlers";

describe("REST shift handlers", () => {
	it("clocks in the authenticated business", async () => {
		const clockIn = vi.fn().mockResolvedValue({ id: "attendance-1" });
		const handlers = createShiftHandlers({
			session: vi.fn().mockResolvedValue({ business: { id: "business-1" } }),
			clockIn,
			clockOut: vi.fn(),
		});

		const response = await handlers.clockIn(
			new Request("https://pet-store.test/api/v1/admin/shifts/clock-in", {
				method: "POST",
				headers: {
					Cookie: "session_token=token-1",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ staffId: "staff-1", date: "2026-08-23" }),
			}),
			"shift-request",
		);

		expect(response.status).toBe(200);
		expect(clockIn).toHaveBeenCalledWith("business-1", {
			staffId: "staff-1",
			date: "2026-08-23",
		});
	});
});
