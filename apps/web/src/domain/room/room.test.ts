import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TBranchId, TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { calculateEffectiveDailyRate, createRoomEntity } from "./room.module";
import type { TRoom, TSeasonalPricing } from "./room.types";

describe("RoomModule", () => {
	describe("createRoomEntity", () => {
		it("should create a valid room entity with defaults", () => {
			const tenantId = generateId() as TTenantId;
			const data = {
				name: "Test Room",
				roomType: "standard" as const,
				capacity: 2,
				dailyRate: 150000,
			};

			const result = Effect.runSync(createRoomEntity(tenantId, data));

			expect(result.id).toBeDefined();
			expect(result.tenantId).toBe(tenantId);
			expect(result.name).toBe("Test Room");
			expect(result.roomType).toBe("standard");
			expect(result.capacity).toBe(2);
			expect(result.dailyRate).toBe(150000);
			expect(result.isActive).toBe(true);
			expect(result.sortOrder).toBe(0);
			expect(result.description).toBeNull();
			expect(result.branchId).toBeNull();
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.updatedAt).toBeInstanceOf(Date);
		});

		it("should apply all provided optional fields", () => {
			const result = Effect.runSync(
				createRoomEntity("tenant-1" as TTenantId, {
					name: "Deluxe Room",
					roomType: "deluxe",
					capacity: 4,
					dailyRate: 300000,
					description: "Spacious room with view",
					branchId: "branch-1" as TBranchId,
					isActive: false,
					sortOrder: 5,
				}),
			);

			expect(result.name).toBe("Deluxe Room");
			expect(result.roomType).toBe("deluxe");
			expect(result.capacity).toBe(4);
			expect(result.dailyRate).toBe(300000);
			expect(result.description).toBe("Spacious room with view");
			expect(result.branchId).toBe("branch-1");
			expect(result.isActive).toBe(false);
			expect(result.sortOrder).toBe(5);
		});

		it("should create all room types", () => {
			const types = ["standard", "deluxe", "suite", "vip"] as const;
			for (const roomType of types) {
				const result = Effect.runSync(
					createRoomEntity("tenant-1" as TTenantId, {
						name: `${roomType} Room`,
						roomType,
						capacity: 2,
						dailyRate: 100000,
					}),
				);
				expect(result.roomType).toBe(roomType);
			}
		});
	});

	describe("calculateEffectiveDailyRate", () => {
		const baseRoom = { dailyRate: 200000 } as TRoom;

		it("returns base rate when no seasonal pricing", () => {
			const rate = calculateEffectiveDailyRate(baseRoom, null);
			expect(rate).toBe(200000);
		});

		it("applies percentage surcharge correctly", () => {
			const pricing = {
				surchargePercent: 20,
				surchargeFixed: 0,
			} as TSeasonalPricing;
			const rate = calculateEffectiveDailyRate(baseRoom, pricing);
			expect(rate).toBe(240000);
		});

		it("applies fixed surcharge correctly", () => {
			const pricing = {
				surchargePercent: 0,
				surchargeFixed: 50000,
			} as TSeasonalPricing;
			const rate = calculateEffectiveDailyRate(baseRoom, pricing);
			expect(rate).toBe(250000);
		});

		it("applies both percentage and fixed surcharge together", () => {
			const pricing = {
				surchargePercent: 10,
				surchargeFixed: 25000,
			} as TSeasonalPricing;
			const rate = calculateEffectiveDailyRate(baseRoom, pricing);
			expect(rate).toBe(245000);
		});

		it("returns base rate when surcharges are zero", () => {
			const pricing = {
				surchargePercent: 0,
				surchargeFixed: 0,
			} as TSeasonalPricing;
			const rate = calculateEffectiveDailyRate(baseRoom, pricing);
			expect(rate).toBe(200000);
		});
	});
});
