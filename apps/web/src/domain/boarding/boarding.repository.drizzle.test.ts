// @vitest-environment node
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TRoomId } from "@/domain/room/room.types";
import { type DrizzleClient, IDrizzleClient } from "@/infra/db/drizzle/client";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { IBoardingRepository } from "./boarding.repository";
import { BoardingRepositoryDrizzle } from "./boarding.repository.drizzle";
import type { TBoardingId, TBoardingWithPets } from "./boarding.types";

interface TestTransactionOptions {
	readonly roomFound: boolean;
	readonly overlappingCount: number;
	readonly roomDailyRate?: string;
}

interface TestTransactionState {
	inserted: boolean;
	insertedDailyRate: string | undefined;
	roomLocked: boolean;
}

type DrizzleTransaction = Parameters<
	Parameters<DrizzleClient["transaction"]>[0]
>[0];

const tenantId = generateId<TTenantId>();
const branchId = generateId<TBranchId>();
const userId = generateId<TUserId>();
const roomId = generateId<TRoomId>();

const makeBoarding = (
	overrides: Partial<TBoardingWithPets> = {},
): TBoardingWithPets => {
	const now = new Date();
	return {
		id: generateId<TBoardingId>(),
		tenantId,
		branchId,
		customerId: null,
		ownerName: "Boarding owner",
		ownerAddress: "Test address",
		ownerPhone: "0800000000",
		emergencyContactName: null,
		emergencyContactPhone: null,
		ownerSignature: null,
		checkInDate: new Date("2026-09-10T00:00:00.000Z"),
		estimatedCheckOutDate: new Date("2026-09-12T00:00:00.000Z"),
		notes: null,
		status: "active",
		roomId,
		dailyRate: 100000,
		actualCheckout: null,
		totalAmount: 0,
		consentAcceptedAt: now,
		createdBy: userId,
		createdAt: now,
		updatedAt: now,
		pets: [],
		...overrides,
	};
};

const makeDb = (
	options: TestTransactionOptions,
): { readonly db: DrizzleClient; readonly state: TestTransactionState } => {
	const state: TestTransactionState = {
		inserted: false,
		insertedDailyRate: undefined,
		roomLocked: false,
	};

	const select = (fields: Record<string, object>) => {
		const isBranchSelection = "businessId" in fields;
		const isCountSelection = "count" in fields;
		const result = isBranchSelection
			? [{ id: branchId, businessId: tenantId, capacity: 100 }]
			: isCountSelection
				? [{ count: options.overlappingCount }]
				: options.roomFound
					? [
							{
								id: roomId,
								capacity: 1,
								dailyRate: options.roomDailyRate ?? "175000",
							},
						]
					: [];
		const promise = Promise.resolve(result);
		const handleLock = vi.fn((strength: string) => {
			if (!isBranchSelection && strength === "update") {
				state.roomLocked = true;
			}
			return query;
		});
		const query = Object.assign(promise, {
			from: vi.fn(),
			where: vi.fn(),
			for: vi.fn((strength: string) => {
				return handleLock(strength);
			}),
			limit: vi.fn(() => promise),
		});
		query.from.mockReturnValue(query);
		query.where.mockReturnValue(query);
		return query;
	};

	const tx = {
		select,
		insert: vi.fn(() => ({
			values: vi.fn(async (values: { readonly dailyRate?: string }) => {
				state.inserted = true;
				state.insertedDailyRate = values.dailyRate;
			}),
		})),
	} as unknown as DrizzleTransaction;

	const db = {
		transaction: vi.fn(
			(callback: (transaction: DrizzleTransaction) => Promise<void>) =>
				callback(tx),
		),
	} as unknown as DrizzleClient;

	return { db, state };
};

const save = (boarding: TBoardingWithPets, options: TestTransactionOptions) => {
	const { db, state } = makeDb(options);
	const layer = Layer.provide(
		BoardingRepositoryDrizzle,
		Layer.succeed(IDrizzleClient, db),
	);
	const effect = Effect.gen(function* () {
		const repo = yield* IBoardingRepository;
		yield* repo.saveFull(boarding);
	}).pipe(Effect.provide(layer));

	return { effect, state };
};

describe("boarding repository drizzle", () => {
	it.each(["cross-tenant", "cross-branch", "inactive"])(
		"rejects a %s room with DatabaseError before insert",
		async () => {
			const { effect, state } = save(makeBoarding(), {
				roomFound: false,
				overlappingCount: 0,
			});
			const exit = await Effect.runPromiseExit(effect);

			expect(exit._tag).toBe("Failure");
			if (exit._tag === "Failure") {
				expect(JSON.stringify(exit.cause)).toContain("DatabaseError");
			}
			expect(state.inserted).toBe(false);
		},
	);

	it("locks the room and rejects an overlapping boarding when capacity is full", async () => {
		const { effect, state } = save(makeBoarding(), {
			roomFound: true,
			overlappingCount: 1,
		});
		const exit = await Effect.runPromiseExit(effect);

		expect(exit._tag).toBe("Failure");
		if (exit._tag === "Failure") {
			expect(JSON.stringify(exit.cause)).toContain("DatabaseError");
		}
		expect(state.roomLocked).toBe(true);
		expect(state.inserted).toBe(false);
	});

	it("inserts when the room has capacity for the requested dates", async () => {
		const { effect, state } = save(makeBoarding(), {
			roomFound: true,
			overlappingCount: 0,
		});

		await Effect.runPromise(effect);

		expect(state.roomLocked).toBe(true);
		expect(state.inserted).toBe(true);
	});

	it("persists the locked room daily rate instead of the client value", async () => {
		const { effect, state } = save(makeBoarding({ dailyRate: 1 }), {
			roomFound: true,
			overlappingCount: 0,
			roomDailyRate: "225000",
		});

		await Effect.runPromise(effect);

		expect(state.insertedDailyRate).toBe("225000");
	});
});
