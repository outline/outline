import { describe, expect, it, vi } from "vitest";
import { createPublicHandlers } from "./public.handlers";

describe("REST public handlers", () => {
	it("passes the requested date to room availability", async () => {
		const rooms = vi.fn().mockResolvedValue([]);
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue({
				id: "business-1",
				name: "Petso",
				slug: "petso",
				logoUrl: null,
			}),
			branches: vi.fn().mockResolvedValue([]),
			rooms,
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking: vi.fn(),
		});

		const response = await handlers.rooms(
			new Request(
				"https://pet-store.test/api/v1/public/business/petso/rooms?date=2026-08-25",
			),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(200);
		expect(rooms).toHaveBeenCalledWith(
			"business-1",
			new Date("2026-08-25"),
		);
	});
});
