import { describe, expect, it, vi } from "vitest";
import {
	IdempotencyConflictError,
	IdempotencyRequestInProgressError,
} from "@/shared/utils/idempotency";
import { createPublicHandlers } from "./public.handlers";

describe("REST public handlers", () => {
	const business = {
		id: "00000000-0000-0000-0000-000000000001",
		name: "Petso",
		slug: "petso",
		logoUrl: null,
	};
	const branch = {
		id: "00000000-0000-0000-0000-000000000002",
		businessId: business.id,
		name: "Main",
		address: null,
		phone: null,
		capacity: 10,
		isActive: true,
	};
	const room = {
		id: "00000000-0000-0000-0000-000000000003",
		businessId: business.id,
		branchId: branch.id,
		name: "Suite 1",
		description: null,
		roomType: "suite",
		capacity: 1,
		dailyRate: 150_000,
		isActive: true,
		occupied: 0,
		available: 1,
	};
	const portal = {
		id: "00000000-0000-0000-0000-000000000004",
		tenantId: business.id,
		slug: "petso",
		isActive: true,
		bookingEnabled: true,
		loginEnabled: true,
		guestBooking: true,
		depositRequired: false,
		depositAmount: 0,
		logoUrl: null,
	};
	const service = {
		id: "00000000-0000-0000-0000-000000000005",
		tenantId: business.id,
		name: "Grooming",
		description: null,
		durationMinutes: 60,
		price: 100_000,
		isActive: true,
		category: null,
	};

	it("creates a booking only for a valid branch and room", async () => {
		const createBooking = vi.fn().mockResolvedValue({ id: "booking-1" });
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue(business),
			portal: vi.fn().mockResolvedValue(portal),
			services: vi.fn().mockResolvedValue([service]),
			branches: vi.fn().mockResolvedValue([branch]),
			rooms: vi.fn().mockResolvedValue([room]),
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking,
		});

		const response = await handlers.booking(
			new Request(
				"https://pet-store.test/api/v1/public/business/petso/bookings",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						branchId: branch.id,
						roomId: room.id,
						customerName: "Alice",
						customerPhone: "08123456789",
						petName: "Buddy",
						scheduledAt: "2026-08-25T10:00:00.000Z",
						estimatedCheckOutAt: "2026-08-27T10:00:00.000Z",
						idempotencyKey: "booking-request-1",
					}),
				},
			),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(201);
		expect(createBooking).toHaveBeenCalledTimes(1);
	});

	it.each([
		["idempotency_conflict", new IdempotencyConflictError()],
		["request_in_progress", new IdempotencyRequestInProgressError()],
	])("returns 409 %s for a typed idempotency error", async (code, error) => {
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue(business),
			portal: vi.fn().mockResolvedValue(portal),
			services: vi.fn().mockResolvedValue([]),
			branches: vi.fn().mockResolvedValue([branch]),
			rooms: vi.fn().mockResolvedValue([room]),
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking: vi.fn().mockRejectedValue(error),
		});

		const response = await handlers.booking(
			bookingRequest(),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({
			success: false,
			error: { code },
			meta: { requestId: "public-request" },
		});
	});

	it("rejects a booking for a branch outside the public business", async () => {
		const createBooking = vi.fn();
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue(business),
			portal: vi.fn().mockResolvedValue(portal),
			services: vi.fn().mockResolvedValue([service]),
			branches: vi.fn().mockResolvedValue([]),
			rooms: vi.fn().mockResolvedValue([room]),
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking,
		});

		const response = await handlers.booking(
			new Request(
				"https://pet-store.test/api/v1/public/business/petso/bookings",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						branchId: branch.id,
						roomId: room.id,
						customerName: "Alice",
						customerPhone: "08123456789",
						petName: "Buddy",
						scheduledAt: "2026-08-25T10:00:00.000Z",
						estimatedCheckOutAt: "2026-08-27T10:00:00.000Z",
						idempotencyKey: "booking-request-2",
					}),
				},
			),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(422);
		expect(createBooking).not.toHaveBeenCalled();
	});

	it("hides a booking endpoint without a portal", async () => {
		const createBooking = vi.fn();
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue(business),
			portal: vi.fn().mockResolvedValue(null),
			services: vi.fn().mockResolvedValue([]),
			branches: vi.fn().mockResolvedValue([branch]),
			rooms: vi.fn().mockResolvedValue([room]),
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking,
		});

		const response = await handlers.booking(
			bookingRequest(),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(404);
		expect(createBooking).not.toHaveBeenCalled();
	});

	it("hides a booking endpoint for an inactive portal", async () => {
		const createBooking = vi.fn();
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue(business),
			portal: vi.fn().mockResolvedValue({ ...portal, isActive: false }),
			services: vi.fn().mockResolvedValue([]),
			branches: vi.fn().mockResolvedValue([branch]),
			rooms: vi.fn().mockResolvedValue([room]),
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking,
		});

		const response = await handlers.booking(
			bookingRequest(),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(404);
		expect(createBooking).not.toHaveBeenCalled();
	});

	it("hides a booking endpoint when booking is disabled", async () => {
		const createBooking = vi.fn();
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue(business),
			portal: vi.fn().mockResolvedValue({ ...portal, bookingEnabled: false }),
			services: vi.fn().mockResolvedValue([]),
			branches: vi.fn().mockResolvedValue([branch]),
			rooms: vi.fn().mockResolvedValue([room]),
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking,
		});

		const response = await handlers.booking(
			bookingRequest(),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(404);
		expect(createBooking).not.toHaveBeenCalled();
	});

	it("rejects unauthenticated booking when guest booking is disabled", async () => {
		const createBooking = vi.fn();
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue(business),
			portal: vi.fn().mockResolvedValue({ ...portal, guestBooking: false }),
			services: vi.fn().mockResolvedValue([]),
			branches: vi.fn().mockResolvedValue([branch]),
			rooms: vi.fn().mockResolvedValue([room]),
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking,
		});

		const response = await handlers.booking(
			bookingRequest(),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			error: { code: "guest_booking_disabled" },
		});
		expect(createBooking).not.toHaveBeenCalled();
	});

	it.each([
		["missing", []],
		["inactive", [{ ...service, isActive: false }]],
		[
			"owned by another tenant",
			[{ ...service, tenantId: "00000000-0000-0000-0000-000000000099" }],
		],
	])("rejects a %s optional service", async (_case, services) => {
		const createBooking = vi.fn();
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue(business),
			portal: vi.fn().mockResolvedValue(portal),
			services: vi.fn().mockResolvedValue(services),
			branches: vi.fn().mockResolvedValue([branch]),
			rooms: vi.fn().mockResolvedValue([room]),
			featured: vi.fn().mockResolvedValue([]),
			product: vi.fn().mockResolvedValue(null),
			createBooking,
		});

		const response = await handlers.booking(
			bookingRequest({ serviceId: service.id }),
			"public-request",
			"petso",
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "validation_error" },
		});
		expect(createBooking).not.toHaveBeenCalled();
	});

	it("passes the requested date to room availability", async () => {
		const rooms = vi.fn().mockResolvedValue([]);
		const handlers = createPublicHandlers({
			business: vi.fn().mockResolvedValue({
				id: "business-1",
				name: "Petso",
				slug: "petso",
				logoUrl: null,
			}),
			portal: vi.fn().mockResolvedValue(portal),
			services: vi.fn().mockResolvedValue([]),
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
		expect(rooms).toHaveBeenCalledWith("business-1", new Date("2026-08-25"));
	});
});

function bookingRequest(
	overrides: Readonly<Record<string, string>> = {},
): Request {
	return new Request(
		"https://pet-store.test/api/v1/public/business/petso/bookings",
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				branchId: "00000000-0000-0000-0000-000000000002",
				roomId: "00000000-0000-0000-0000-000000000003",
				customerName: "Alice",
				customerPhone: "08123456789",
				petName: "Buddy",
				scheduledAt: "2026-08-25T10:00:00.000Z",
				estimatedCheckOutAt: "2026-08-27T10:00:00.000Z",
				idempotencyKey: "booking-request-1",
				...overrides,
			}),
		},
	);
}
