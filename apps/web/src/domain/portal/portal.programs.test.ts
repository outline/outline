import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { PortalError } from "./portal.errors";
import {
	createPortalBookingProgram,
	createPortalServiceProgram,
	deletePortalServiceProgram,
	getPortalBookingsProgram,
	getPortalConfigBySlugProgram,
	getPortalConfigProgram,
	getPortalReviewsProgram,
	getPortalServicesProgram,
	getPortalStatsProgram,
	updatePortalBookingStatusProgram,
	updatePortalConfigProgram,
} from "./portal.programs";
import { IPortalRepository } from "./portal.repository";
import type {
	CreatePortalBookingCommand,
	UpdatePortalBookingStatusCommand,
	UpdatePortalConfigCommand,
} from "./portal.schemas";
import type {
	TPortalBooking,
	TPortalConfig,
	TPortalReview,
	TPortalService,
	TPortalServiceId,
	TPortalStats,
} from "./portal.types";

const tenantId = generateId<TTenantId>();

const baseConfig: TPortalConfig = {
	id: generateId(),
	tenantId,
	slug: "my-pet-shop",
	isActive: true,
	bookingEnabled: true,
	loginEnabled: true,
	guestBooking: false,
	depositRequired: true,
	depositAmount: 50_000,
	logoUrl: null,
};

const baseBooking: TPortalBooking = {
	id: generateId(),
	tenantId,
	branchId: null,
	serviceId: null,
	customerName: "Alice",
	customerPhone: "08123456789",
	customerEmail: null,
	petName: "Buddy",
	petSpecies: null,
	petBreed: null,
	scheduledAt: new Date("2026-07-15T10:00:00Z"),
	notes: null,
	status: "pending",
	createdAt: new Date(),
};

const baseService: TPortalService = {
	id: generateId<TPortalServiceId>(),
	tenantId,
	name: "Grooming",
	description: "Full grooming service",
	durationMinutes: 60,
	price: 150_000,
	isActive: true,
	category: null,
};

const baseReview: TPortalReview = {
	id: generateId(),
	customerName: "Budi",
	rating: 5,
	content: "Great service!",
	createdAt: "2026-06-01T00:00:00Z",
};

const baseStats: TPortalStats = {
	totalReviews: 10,
	averageRating: 4.5,
	totalServices: 5,
	totalPets: 100,
};

const makeMockRepo = (overrides?: Record<string, unknown>) => {
	const base = {
		getConfig: vi.fn(),
		getServices: vi.fn(),
		updateConfig: vi.fn(() => Effect.void),
		saveBooking: vi.fn(() => Effect.void),
		createService: vi.fn(),
		deleteService: vi.fn(() => Effect.void),
		getConfigBySlug: vi.fn(),
		getBookings: vi.fn(),
		updateBookingStatus: vi.fn(() => Effect.void),
		getReviews: vi.fn(),
		getStats: vi.fn(),
	};
	return { ...base, ...overrides } as unknown as Parameters<
		typeof IPortalRepository.of
	>[0];
};

const provideRepo = (mock: ReturnType<typeof makeMockRepo>) =>
	Layer.succeed(IPortalRepository, IPortalRepository.of(mock));

describe("PortalPrograms", () => {
	describe("getPortalConfigProgram", () => {
		it("should return existing config", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(baseConfig)),
			});

			const result = await Effect.runPromise(
				Effect.provide(getPortalConfigProgram(tenantId), provideRepo(mock)),
			);

			expect(result.slug).toBe("my-pet-shop");
			expect(result.isActive).toBe(true);
		});

		it("should return default config when null", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(null)),
			});

			const result = await Effect.runPromise(
				Effect.provide(getPortalConfigProgram(tenantId), provideRepo(mock)),
			);

			expect(result.isActive).toBe(false);
			expect(result.slug).toBe("");
		});

		it("should propagate DatabaseError", async () => {
			const dbErr = new DatabaseError({ cause: new Error("db fail") });
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(getPortalConfigProgram(tenantId), provideRepo(mock)),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});

	describe("getPortalConfigBySlugProgram", () => {
		it("should return config by slug", async () => {
			const mock = makeMockRepo({
				getConfigBySlug: vi.fn(() => Effect.succeed(baseConfig)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					getPortalConfigBySlugProgram("my-pet-shop"),
					provideRepo(mock),
				),
			);

			expect(result?.slug).toBe("my-pet-shop");
			expect(mock.getConfigBySlug).toHaveBeenCalledWith("my-pet-shop");
		});

		it("should return null when slug not found", async () => {
			const mock = makeMockRepo({
				getConfigBySlug: vi.fn(() => Effect.succeed(null)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					getPortalConfigBySlugProgram("unknown"),
					provideRepo(mock),
				),
			);

			expect(result).toBeNull();
		});
	});

	describe("getPortalServicesProgram", () => {
		it("should return services", async () => {
			const mock = makeMockRepo({
				getServices: vi.fn(() => Effect.succeed([baseService])),
			});

			const result = await Effect.runPromise(
				Effect.provide(getPortalServicesProgram(tenantId), provideRepo(mock)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Grooming");
		});
	});

	describe("updatePortalConfigProgram", () => {
		const command: UpdatePortalConfigCommand = {
			slug: "new-slug",
			depositAmount: 100_000,
		};

		it("should merge and update config", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(baseConfig)),
				updateConfig: vi.fn(() => Effect.void),
			});

			await Effect.runPromise(
				Effect.provide(
					updatePortalConfigProgram(command, tenantId),
					provideRepo(mock),
				),
			);

			expect(mock.getConfig).toHaveBeenCalledWith(tenantId);
			expect(mock.updateConfig).toHaveBeenCalledWith(
				expect.objectContaining({ slug: "new-slug", depositAmount: 100_000 }),
			);
		});

		it("should work when no existing config", async () => {
			const mock = makeMockRepo({
				getConfig: vi.fn(() => Effect.succeed(null)),
				updateConfig: vi.fn(() => Effect.void),
			});

			await Effect.runPromise(
				Effect.provide(
					updatePortalConfigProgram(command, tenantId),
					provideRepo(mock),
				),
			);

			expect(mock.updateConfig).toHaveBeenCalledTimes(1);
		});
	});

	describe("createPortalBookingProgram", () => {
		const command: CreatePortalBookingCommand = {
			slug: "test-slug",
			customerName: "Alice",
			customerPhone: "08123456789",
			petName: "Buddy",
			scheduledAt: new Date("2026-07-15T10:00:00Z"),
		};

		it("should create a booking", async () => {
			const mock = makeMockRepo({
				saveBooking: vi.fn(() => Effect.void),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					createPortalBookingProgram(tenantId, command),
					provideRepo(mock),
				),
			);

			expect(result.customerName).toBe("Alice");
			expect(result.status).toBe("pending");
			expect(mock.saveBooking).toHaveBeenCalledTimes(1);
		});

		it("should propagate DatabaseError", async () => {
			const dbErr = new DatabaseError({ cause: new Error("db fail") });
			const mock = makeMockRepo({
				saveBooking: vi.fn(() => Effect.fail(dbErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						createPortalBookingProgram(tenantId, command),
						provideRepo(mock),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});

	describe("getPortalBookingsProgram", () => {
		it("should return bookings", async () => {
			const mock = makeMockRepo({
				getBookings: vi.fn(() => Effect.succeed([baseBooking])),
			});

			const result = await Effect.runPromise(
				Effect.provide(getPortalBookingsProgram(tenantId), provideRepo(mock)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.customerName).toBe("Alice");
		});
	});

	describe("updatePortalBookingStatusProgram", () => {
		const command: UpdatePortalBookingStatusCommand = {
			bookingId: baseBooking.id,
			status: "confirmed",
		};

		it("should update booking status scoped to tenantId", async () => {
			const mock = makeMockRepo({
				updateBookingStatus: vi.fn(() => Effect.void),
			});

			await Effect.runPromise(
				Effect.provide(
					updatePortalBookingStatusProgram(tenantId, command),
					provideRepo(mock),
				),
			);

			expect(mock.updateBookingStatus).toHaveBeenCalledWith(
				tenantId,
				baseBooking.id,
				"confirmed",
			);
		});
	});

	describe("createPortalServiceProgram", () => {
		const serviceInput: Omit<TPortalService, "id"> = {
			tenantId,
			name: "Grooming",
			description: "Full grooming",
			durationMinutes: 60,
			price: 150_000,
			isActive: true,
			category: null,
		};

		it("should create a service", async () => {
			const mock = makeMockRepo({
				createService: vi.fn(() => Effect.succeed(baseService)),
			});

			const result = await Effect.runPromise(
				Effect.provide(
					createPortalServiceProgram(tenantId, serviceInput),
					provideRepo(mock),
				),
			);

			expect(result.name).toBe("Grooming");
			expect(mock.createService).toHaveBeenCalledWith(tenantId, serviceInput);
		});

		it("should propagate PortalError", async () => {
			const portalErr = new PortalError({ message: "service creation failed" });
			const mock = makeMockRepo({
				createService: vi.fn(() => Effect.fail(portalErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						createPortalServiceProgram(tenantId, serviceInput),
						provideRepo(mock),
					),
				),
			).rejects.toMatchObject({ name: expect.stringContaining("PortalError") });
		});
	});

	describe("deletePortalServiceProgram", () => {
		it("should delete a service", async () => {
			const mock = makeMockRepo({
				deleteService: vi.fn(() => Effect.void),
			});

			await Effect.runPromise(
				Effect.provide(
					deletePortalServiceProgram(tenantId, baseService.id),
					provideRepo(mock),
				),
			);

			expect(mock.deleteService).toHaveBeenCalledWith(tenantId, baseService.id);
		});

		it("should propagate PortalError", async () => {
			const portalErr = new PortalError({ message: "delete failed" });
			const mock = makeMockRepo({
				deleteService: vi.fn(() => Effect.fail(portalErr)),
			});

			await expect(
				Effect.runPromise(
					Effect.provide(
						deletePortalServiceProgram(tenantId, baseService.id),
						provideRepo(mock),
					),
				),
			).rejects.toMatchObject({ name: expect.stringContaining("PortalError") });
		});
	});

	describe("getPortalReviewsProgram", () => {
		it("should return reviews", async () => {
			const mock = makeMockRepo({
				getReviews: vi.fn(() => Effect.succeed([baseReview])),
			});

			const result = await Effect.runPromise(
				Effect.provide(getPortalReviewsProgram(tenantId), provideRepo(mock)),
			);

			expect(result).toHaveLength(1);
			expect(result[0]?.rating).toBe(5);
		});

		it("should return reviews with limit option", async () => {
			const mock = makeMockRepo({
				getReviews: vi.fn(() => Effect.succeed([baseReview])),
			});

			await Effect.runPromise(
				Effect.provide(
					getPortalReviewsProgram(tenantId, { limit: 3 }),
					provideRepo(mock),
				),
			);

			expect(mock.getReviews).toHaveBeenCalledWith(tenantId, { limit: 3 });
		});
	});

	describe("getPortalStatsProgram", () => {
		it("should return portal stats", async () => {
			const mock = makeMockRepo({
				getStats: vi.fn(() => Effect.succeed(baseStats)),
			});

			const result = await Effect.runPromise(
				Effect.provide(getPortalStatsProgram(tenantId), provideRepo(mock)),
			);

			expect(result.totalReviews).toBe(10);
			expect(result.averageRating).toBe(4.5);
		});
	});
});
