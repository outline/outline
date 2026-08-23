import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TRoomId } from "@/domain/room/room.types";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { BoardingModule } from "./boarding.module";

describe("BoardingModule", () => {
	const mockProps = {
		tenantId: generateId<TTenantId>(),
		customerId: null,
		ownerSignature: null,
		roomId: "room-123" as TRoomId,
		dailyRate: 100000,
		totalDailyRate: 100000,
		totalAmount: 0,
		createdBy: "user-123" as TUserId,
		branchId: generateId<TBranchId>(),
		ownerName: "John Doe",
		ownerPhone: "0812345678",
		ownerAddress: "Jl. Contoh",
		emergencyContactName: "Jane Doe",
		emergencyContactPhone: "0812345679",
		checkInDate: new Date("2026-06-08"),
		estimatedCheckOutDate: new Date("2026-06-10"),
		status: "draft" as const,
		notes: "",
	};

	describe("createFullBoarding", () => {
		it("should create boarding with pets", () => {
			const pets = [
				{
					name: "Kitty",
					kind: "cat" as const,
					breed: "Persian",
					vaccinated: "no" as const,
					weight: "5kg",
					healthStatus: "sick",
					initialCondition: "flu",
					notes: "needs medicine",
				},
			];
			const program = BoardingModule.createFullBoarding(mockProps, pets);
			const result = Effect.runSync(program);

			expect(result.ownerName).toBe("John Doe");
			expect(result.pets).toHaveLength(1);
			expect(result.pets[0]?.name).toBe("Kitty");
		});

		it("should fail if no pets provided", () => {
			const program = BoardingModule.createFullBoarding(mockProps, []);
			const result = Effect.runSyncExit(program);
			expect(result._tag).toBe("Failure");
		});

		it("should fail if check-out is before check-in", () => {
			const invalidProps = {
				...mockProps,
				estimatedCheckOutDate: new Date("2026-06-01"),
			};
			const program = BoardingModule.createFullBoarding(invalidProps, [
				{
					name: "Buddy",
					kind: "dog" as const,
					breed: "Golden",
					vaccinated: "yes" as const,
					weight: "20kg",
					healthStatus: "healthy",
					initialCondition: "good",
					notes: "",
				},
			]);
			const result = Effect.runSyncExit(program);
			expect(result._tag).toBe("Failure");
		});
	});

	describe("updateStatus", () => {
		it("should allow valid transitions", () => {
			const boarding = { id: "123", status: "draft" } as unknown as Parameters<
				typeof BoardingModule.updateStatus
			>[0];
			const program = BoardingModule.updateStatus(boarding, "active");
			const result = Effect.runSync(program);
			expect(result.status).toBe("active");
		});

		it("should fail transition from completed", () => {
			const boarding = {
				id: "123",
				status: "completed",
			} as unknown as Parameters<typeof BoardingModule.updateStatus>[0];
			const program = BoardingModule.updateStatus(boarding, "active");
			const result = Effect.runSyncExit(program);
			expect(result._tag).toBe("Failure");
		});
	});
});
