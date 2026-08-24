import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { PortalError } from "./portal.errors";
import type {
	TPortalBooking,
	TPortalConfig,
	TPortalReview,
	TPortalService,
	TPortalServiceId,
	TPortalStats,
} from "./portal.types";

export class IPortalRepository extends Context.Tag("IPortalRepository")<
	IPortalRepository,
	{
		readonly getConfig: (
			tenantId: TTenantId,
		) => Effect.Effect<TPortalConfig | null, DatabaseError>;
		readonly getServices: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TPortalService[], DatabaseError>;
		readonly updateConfig: (
			config: TPortalConfig,
		) => Effect.Effect<void, DatabaseError>;
		readonly saveBooking: (
			booking: TPortalBooking,
		) => Effect.Effect<TPortalBooking, DatabaseError>;
		readonly createService: (
			tenantId: TTenantId,
			service: Omit<TPortalService, "id">,
		) => Effect.Effect<TPortalService, PortalError | DatabaseError>;
		readonly deleteService: (
			tenantId: TTenantId,
			serviceId: TPortalServiceId,
		) => Effect.Effect<void, PortalError | DatabaseError>;
		readonly updateServiceStatus: (
			tenantId: TTenantId,
			serviceId: TPortalServiceId,
			isActive: boolean,
		) => Effect.Effect<void, PortalError | DatabaseError>;
		readonly getConfigBySlug: (
			slug: string,
		) => Effect.Effect<TPortalConfig | null, DatabaseError>;
		readonly getBookings: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TPortalBooking[], DatabaseError>;
		readonly updateBookingStatus: (
			tenantId: TTenantId,
			bookingId: string,
			status: TPortalBooking["status"],
		) => Effect.Effect<void, DatabaseError>;
		readonly confirmBooking: (
			tenantId: TTenantId,
			bookingId: string,
			actorUserId?: string,
		) => Effect.Effect<void, DatabaseError | PortalError>;
		readonly getReviews: (
			tenantId: TTenantId,
			options?: { limit?: number },
		) => Effect.Effect<TPortalReview[], PortalError | DatabaseError>;
		readonly getStats: (
			tenantId: TTenantId,
		) => Effect.Effect<TPortalStats, PortalError | DatabaseError, never>;
	}
>() {}
