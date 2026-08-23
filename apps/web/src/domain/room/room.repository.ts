import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	RoomNotFoundError,
	SeasonalPricingNotFoundError,
} from "./room.errors";
import type {
	TRoom,
	TRoomId,
	TSeasonalPricing,
	TSeasonalPricingId,
} from "./room.types";

export interface IRoomRepository {
	// Rooms
	getRooms(
		tenantId: TTenantId,
		branchId: string,
	): Effect.Effect<readonly TRoom[], DatabaseError>;
	getRoomById(
		id: TRoomId,
		tenantId: TTenantId,
	): Effect.Effect<TRoom, DatabaseError | RoomNotFoundError>;
	saveRoom(
		room: Omit<TRoom, "id" | "createdAt" | "updatedAt">,
	): Effect.Effect<TRoom, DatabaseError>;
	updateRoom(
		id: TRoomId,
		updates: Partial<Omit<TRoom, "id" | "createdAt" | "updatedAt">>,
		tenantId: TTenantId,
	): Effect.Effect<TRoom, DatabaseError | RoomNotFoundError>;
	deleteRoom(
		id: TRoomId,
		tenantId: TTenantId,
	): Effect.Effect<void, DatabaseError | RoomNotFoundError>;

	// Seasonal Pricing
	getSeasonalPricings(
		tenantId: TTenantId,
	): Effect.Effect<readonly TSeasonalPricing[], DatabaseError>;
	getActiveSeasonalPricing(
		tenantId: TTenantId,
		targetDate: Date,
	): Effect.Effect<TSeasonalPricing | null, DatabaseError>;
	saveSeasonalPricing(
		pricing: Omit<TSeasonalPricing, "id">,
	): Effect.Effect<TSeasonalPricing, DatabaseError>;
	updateSeasonalPricing(
		id: TSeasonalPricingId,
		updates: Partial<Omit<TSeasonalPricing, "id">>,
		tenantId: TTenantId,
	): Effect.Effect<
		TSeasonalPricing,
		DatabaseError | SeasonalPricingNotFoundError
	>;
	deleteSeasonalPricing(
		id: TSeasonalPricingId,
		tenantId: TTenantId,
	): Effect.Effect<void, DatabaseError | SeasonalPricingNotFoundError>;
}

export const RoomRepository = Context.GenericTag<IRoomRepository>(
	"@domain/room/RoomRepository",
);
