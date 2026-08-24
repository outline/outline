import { describe, expect, it, vi } from "vitest";
import { createPortalHandlers } from "./portal.handlers";

describe("REST portal handlers", () => {
	it("loads the portal aggregate for the authenticated business", async () => {
		const get = vi.fn().mockResolvedValue({ services: [] });
		const handlers = createPortalHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			get,
			createService: vi.fn(),
			updateServiceStatus: vi.fn(),
			deleteService: vi.fn(),
			updateConfig: vi.fn(),
			updateBookingStatus: vi.fn(),
		});

		const response = await handlers.get(
			new Request("https://pet-store.test/api/v1/admin/portal", {
				headers: { Cookie: "session_token=token-1" },
			}),
			"portal-request",
		);

		expect(response.status).toBe(200);
		expect(get).toHaveBeenCalledWith("business-1");
	});

	it("updates a booking status for the authenticated business", async () => {
		const updateBookingStatus = vi.fn().mockResolvedValue(undefined);
		const handlers = createPortalHandlers({
			session: vi.fn().mockResolvedValue({
				business: { id: "business-1" },
				user: { id: "user-1" },
			}),
			get: vi.fn(),
			createService: vi.fn(),
			updateServiceStatus: vi.fn(),
			deleteService: vi.fn(),
			updateConfig: vi.fn(),
			updateBookingStatus,
		});

		const response = await handlers.updateBookingStatus(
			new Request(
				"https://pet-store.test/api/v1/admin/portal/bookings/booking-1/status",
				{
					method: "PATCH",
					headers: {
						Cookie: "session_token=token-1",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: "confirmed" }),
				},
			),
			"portal-request",
			"booking-1",
		);

		expect(response.status).toBe(200);
		expect(updateBookingStatus).toHaveBeenCalledWith(
			"business-1",
			"booking-1",
			"confirmed",
			"user-1",
		);
	});
});
