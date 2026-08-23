import * as Schema from "effect/Schema";
import { Effect } from "effect";
import type { TTenantId } from "@/shared/types/common.types";
import { calculateEffectiveDailyRate, createRoomEntity } from "./room.module";
import { RoomRepository } from "./room.repository";
import { CreateRoomSchema, UpdateRoomSchema } from "./room.schemas";
import type { TRoomId } from "./room.types";

export const getEffectiveRoomRateProgram = (
	tenantId: TTenantId,
	roomId: TRoomId,
	targetDate: Date,
) => {
	return Effect.gen(function* (_) {
		const repo = yield* _(RoomRepository);
		const room = yield* _(repo.getRoomById(roomId, tenantId));
		const seasonalPricing = yield* _(
			repo.getActiveSeasonalPricing(tenantId, targetDate),
		);

		return calculateEffectiveDailyRate(room, seasonalPricing);
	});
};

export const createRoomProgram = (tenantId: TTenantId, data: unknown) => {
	return Effect.gen(function* (_) {
		const parsed = yield* _(Schema.decodeUnknown(CreateRoomSchema)(data));
		const room = yield* _(
			createRoomEntity(
				tenantId,
				parsed as Parameters<typeof createRoomEntity>[1],
			),
		);
		const repo = yield* _(RoomRepository);
		return yield* _(repo.saveRoom(room));
	});
};

export const updateRoomProgram = (
	tenantId: TTenantId,
	id: TRoomId,
	data: unknown,
) => {
	return Effect.gen(function* (_) {
		const parsed = yield* _(Schema.decodeUnknown(UpdateRoomSchema)(data));
		const repo = yield* _(RoomRepository);
		return yield* _(
			repo.updateRoom(
				id,
				parsed as Parameters<typeof repo.updateRoom>[1],
				tenantId,
			),
		);
	});
};

export const deleteRoomProgram = (tenantId: TTenantId, id: TRoomId) => {
	return Effect.gen(function* (_) {
		const repo = yield* _(RoomRepository);
		return yield* _(repo.deleteRoom(id, tenantId));
	});
};
