import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { RoomNotFoundError } from "./room.errors";
import {
	createRoomProgram,
	deleteRoomProgram,
	getEffectiveRoomRateProgram,
	updateRoomProgram,
} from "./room.programs";
import { type IRoomRepository, RoomRepository } from "./room.repository";
import type { TRoom, TRoomId, TSeasonalPricing } from "./room.types";

const tenantId = generateId() as TTenantId;
const roomId = generateId() as TRoomId;

const mockRoom: TRoom = {
	id: roomId,
	tenantId,
	branchId: null,
	name: "Standard Room",
	roomType: "standard",
	capacity: 2,
	dailyRate: 150000,
	description: null,
	isActive: true,
	sortOrder: 0,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockSeasonalPricing: TSeasonalPricing = {
	id: generateId(),
	tenantId,
	name: "High Season",
	startDate: new Date("2026-07-01"),
	endDate: new Date("2026-08-31"),
	surchargePercent: 25,
	surchargeFixed: 0,
	isActive: true,
};

function makeRepoMock(
	overrides: Partial<IRoomRepository> = {},
): IRoomRepository {
	return {
		getRooms: vi.fn(),
		getRoomById: vi.fn(),
		saveRoom: vi.fn(),
		updateRoom: vi.fn(),
		deleteRoom: vi.fn(),
		getSeasonalPricings: vi.fn(),
		getActiveSeasonalPricing: vi.fn(),
		saveSeasonalPricing: vi.fn(),
		updateSeasonalPricing: vi.fn(),
		deleteSeasonalPricing: vi.fn(),
		...overrides,
	};
}

function makeLayer(repo: IRoomRepository) {
	return Layer.succeed(RoomRepository, repo);
}

describe("getEffectiveRoomRateProgram", () => {
	it("returns effective rate with seasonal pricing", async () => {
		const repo = makeRepoMock({
			getRoomById: vi.fn().mockReturnValue(Effect.succeed(mockRoom)),
			getActiveSeasonalPricing: vi
				.fn()
				.mockReturnValue(Effect.succeed(mockSeasonalPricing)),
		});
		const targetDate = new Date("2026-07-15");

		const rate = await Effect.runPromise(
			Effect.provide(
				getEffectiveRoomRateProgram(tenantId, roomId, targetDate),
				makeLayer(repo),
			),
		);

		expect(rate).toBe(187500); // 150000 + 25%
		expect(repo.getRoomById).toHaveBeenCalledWith(roomId, tenantId);
		expect(repo.getActiveSeasonalPricing).toHaveBeenCalledWith(
			tenantId,
			targetDate,
		);
	});

	it("returns base rate when no seasonal pricing", async () => {
		const repo = makeRepoMock({
			getRoomById: vi.fn().mockReturnValue(Effect.succeed(mockRoom)),
			getActiveSeasonalPricing: vi.fn().mockReturnValue(Effect.succeed(null)),
		});

		const rate = await Effect.runPromise(
			Effect.provide(
				getEffectiveRoomRateProgram(tenantId, roomId, new Date()),
				makeLayer(repo),
			),
		);

		expect(rate).toBe(150000);
	});

	it("propagates RoomNotFoundError", async () => {
		const repo = makeRepoMock({
			getRoomById: vi
				.fn()
				.mockReturnValue(Effect.fail(new RoomNotFoundError({ roomId }))),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(
					getEffectiveRoomRateProgram(tenantId, roomId, new Date()),
					makeLayer(repo),
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("RoomNotFoundError"),
		});
	});

	it("propagates DatabaseError from getRoomById", async () => {
		const repo = makeRepoMock({
			getRoomById: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(
					getEffectiveRoomRateProgram(tenantId, roomId, new Date()),
					makeLayer(repo),
				),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("createRoomProgram", () => {
	const validData = {
		branchId: generateId(),
		name: "New Room",
		roomType: "suite" as const,
		capacity: 3,
		dailyRate: 250000,
	};

	it("creates a room successfully", async () => {
		const saveRoom = vi
			.fn()
			.mockReturnValue(
				Effect.succeed({ ...mockRoom, name: "New Room", roomType: "suite" }),
			);
		const repo = makeRepoMock({
			saveRoom,
		});

		const result = await Effect.runPromise(
			Effect.provide(createRoomProgram(tenantId, validData), makeLayer(repo)),
		);

		expect(result.name).toBe("New Room");
		expect(saveRoom).toHaveBeenCalledOnce();
	});

	it("fails with parse error for invalid data", async () => {
		const invalidData = { name: "", roomType: "invalid", capacity: -1 };

		await expect(
			Effect.runPromise(
				Effect.provide(
					createRoomProgram(tenantId, invalidData),
					makeLayer(makeRepoMock()),
				),
			),
		).rejects.toThrow();
	});

	it("propagates DatabaseError", async () => {
		const repo = makeRepoMock({
			saveRoom: vi
				.fn()
				.mockReturnValue(
					Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
				),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(createRoomProgram(tenantId, validData), makeLayer(repo)),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("updateRoomProgram", () => {
	const updateData = { name: "Updated Room", dailyRate: 200000 };

	it("updates a room successfully", async () => {
		const updatedRoom = {
			...mockRoom,
			name: "Updated Room",
			dailyRate: 200000,
		};
		const updateRoom = vi.fn().mockReturnValue(Effect.succeed(updatedRoom));
		const repo = makeRepoMock({ updateRoom });

		const result = await Effect.runPromise(
			Effect.provide(
				updateRoomProgram(tenantId, roomId, updateData),
				makeLayer(repo),
			),
		);

		expect(result.name).toBe("Updated Room");
		expect(result.dailyRate).toBe(200000);
		expect(updateRoom).toHaveBeenCalledWith(
			roomId,
			expect.objectContaining({ name: "Updated Room" }),
			tenantId,
		);
	});

	it("propagates RoomNotFoundError", async () => {
		const repo = makeRepoMock({
			updateRoom: vi
				.fn()
				.mockReturnValue(Effect.fail(new RoomNotFoundError({ roomId }))),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(
					updateRoomProgram(tenantId, roomId, updateData),
					makeLayer(repo),
				),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("RoomNotFoundError"),
		});
	});
});

describe("deleteRoomProgram", () => {
	it("deletes a room successfully", async () => {
		const deleteRoom = vi.fn().mockReturnValue(Effect.void);
		const repo = makeRepoMock({ deleteRoom });

		const result = await Effect.runPromise(
			Effect.provide(deleteRoomProgram(tenantId, roomId), makeLayer(repo)),
		);

		expect(result).toBeUndefined();
		expect(deleteRoom).toHaveBeenCalledWith(roomId, tenantId);
	});

	it("propagates RoomNotFoundError", async () => {
		const repo = makeRepoMock({
			deleteRoom: vi
				.fn()
				.mockReturnValue(Effect.fail(new RoomNotFoundError({ roomId }))),
		});

		await expect(
			Effect.runPromise(
				Effect.provide(deleteRoomProgram(tenantId, roomId), makeLayer(repo)),
			),
		).rejects.toMatchObject({
			name: expect.stringContaining("RoomNotFoundError"),
		});
	});
});
