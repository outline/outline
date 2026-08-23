import { Schema } from "@effect/schema";
import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	createRoomProgram,
	deleteRoomProgram,
	getEffectiveRoomRateProgram,
	updateRoomProgram,
} from "@/domain/room/room.programs";
import { RoomRepository } from "@/domain/room/room.repository";
import { CreateRoomSchema, UpdateRoomSchema } from "@/domain/room/room.schemas";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getRooms = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((data: unknown) => (data as { branchId?: string }) || {})
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		return await runApp(
			Effect.gen(function* (_) {
				const repo = yield* _(RoomRepository);
				return yield* _(
					repo.getRooms(businessId as TTenantId, data?.branchId as string),
				);
			}),
		);
	});

export const getRoomById = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((id: unknown) => id as string)
	.handler(async ({ data: id, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Business ID not found");

		return await runApp(
			Effect.gen(function* (_) {
				const repo = yield* _(RoomRepository);
				return yield* _(
					repo.getRoomById(
						id as import("@/domain/room/room.types").TRoomId,
						businessId as TTenantId,
					),
				);
			}),
		);
	});

export const createRoom = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateRoomSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "room:write"));
		return await runApp(createRoomProgram(tenantId, data));
	});

export const updateRoom = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(
		Schema.decodeUnknownSync(
			Schema.Struct({ id: Schema.String, data: UpdateRoomSchema }),
		),
	)
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "room:write"));
		return await runApp(
			updateRoomProgram(
				tenantId,
				data.id as import("@/domain/room/room.types").TRoomId,
				data.data,
			),
		);
	});

export const deleteRoom = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((id: unknown) => id as string)
	.handler(async ({ data: id, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "room:write"));
		await runApp(
			deleteRoomProgram(
				tenantId,
				id as import("@/domain/room/room.types").TRoomId,
			),
		);
		return { success: true };
	});

const GetEffectiveRateSchema = Schema.Struct({
	roomId: Schema.String,
	targetDate: Schema.Date,
});

export const getEffectiveRoomRate = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(GetEffectiveRateSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Business ID not found");

		return await runApp(
			getEffectiveRoomRateProgram(
				businessId as TTenantId,
				data.roomId as import("@/domain/room/room.types").TRoomId,
				data.targetDate,
			),
		);
	});
