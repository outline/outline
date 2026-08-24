import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { PortalError } from "./portal.errors";
import { PortalModule } from "./portal.module";
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

export const getPortalConfigProgram = (
	tenantId: TTenantId,
): Effect.Effect<TPortalConfig, DatabaseError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		const config = yield* repo.getConfig(tenantId);
		return config || PortalModule.defaultConfig(tenantId);
	});

export const getPortalConfigBySlugProgram = (
	slug: string,
): Effect.Effect<TPortalConfig | null, DatabaseError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		return yield* repo.getConfigBySlug(slug);
	});

export const getPortalServicesProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TPortalService[], DatabaseError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		return yield* repo.getServices(tenantId);
	});

export const updatePortalConfigProgram = (
	command: UpdatePortalConfigCommand,
	tenantId: TTenantId,
): Effect.Effect<void, DatabaseError | PortalError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		const existing = yield* repo.getConfig(tenantId);
		const config = PortalModule.mergeConfig(existing, {
			...command,
			tenantId,
		});
		yield* repo.updateConfig(config);
	});

export const createPortalBookingProgram = (
	tenantId: TTenantId,
	command: CreatePortalBookingCommand,
): Effect.Effect<TPortalBooking, DatabaseError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		const booking = PortalModule.createBooking({
			businessId: tenantId,
			branchId: command.branchId,
			serviceId: command.serviceId ?? null,
			roomId: command.roomId,
			idempotencyKey: command.idempotencyKey,
			customerName: command.customerName,
			customerPhone: command.customerPhone,
			customerEmail: command.customerEmail ?? null,
			petName: command.petName,
			petSpecies: command.petSpecies ?? null,
			petBreed: command.petBreed ?? null,
			scheduledAt: new Date(command.scheduledAt),
			estimatedCheckOutAt: new Date(command.estimatedCheckOutAt),
			notes: command.notes ?? null,
		});
		return yield* repo.saveBooking(booking);
	});

export const getPortalBookingsProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TPortalBooking[], DatabaseError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		return yield* repo.getBookings(tenantId);
	});

export const updatePortalBookingStatusProgram = (
	tenantId: TTenantId,
	command: UpdatePortalBookingStatusCommand,
	actorUserId?: string,
): Effect.Effect<void, DatabaseError | PortalError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		if (command.status === "confirmed") {
			yield* repo.confirmBooking(tenantId, command.bookingId, actorUserId);
			return;
		}
		yield* repo.updateBookingStatus(
			tenantId,
			command.bookingId,
			command.status,
		);
	});

export const createPortalServiceProgram = (
	tenantId: TTenantId,
	service: Omit<TPortalService, "id">,
): Effect.Effect<
	TPortalService,
	PortalError | DatabaseError,
	IPortalRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		return yield* repo.createService(tenantId, service);
	});

export const deletePortalServiceProgram = (
	tenantId: TTenantId,
	serviceId: TPortalServiceId,
): Effect.Effect<void, PortalError | DatabaseError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		return yield* repo.deleteService(tenantId, serviceId);
	});

export const updatePortalServiceStatusProgram = (
	tenantId: TTenantId,
	serviceId: TPortalServiceId,
	isActive: boolean,
): Effect.Effect<void, PortalError | DatabaseError, IPortalRepository> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		yield* repo.updateServiceStatus(tenantId, serviceId, isActive);
	});

export const getPortalReviewsProgram = (
	tenantId: TTenantId,
	options?: { limit?: number },
): Effect.Effect<
	TPortalReview[],
	PortalError | DatabaseError,
	IPortalRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		return yield* repo.getReviews(tenantId, options);
	});

export const getPortalStatsProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	TPortalStats,
	PortalError | DatabaseError,
	IPortalRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IPortalRepository;
		return yield* repo.getStats(tenantId);
	});
