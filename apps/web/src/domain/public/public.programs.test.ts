import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import {
	getPublicBranchesProgram,
	getPublicBusinessBySlugProgram,
	getPublicProductProgram,
	getPublicRoomsProgram,
} from "./public.programs";
import { IPublicRepository } from "./public.repository";
import type {
	TPublicBranch,
	TPublicBusiness,
	TPublicProduct,
	TPublicRoom,
} from "./public.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLayer(
	overrides?: Partial<Parameters<typeof IPublicRepository.of>[0]>,
) {
	const defaults = {
		getBusinessBySlug: vi.fn(),
		getBranches: vi.fn(),
		getRooms: vi.fn(),
		getProduct: vi.fn(),
	};
	const mock = { ...defaults, ...overrides } as unknown as Parameters<
		typeof IPublicRepository.of
	>[0];
	return {
		mock,
		layer: Layer.succeed(IPublicRepository, IPublicRepository.of(mock)),
	};
}

const dbError = { _tag: "DatabaseError" as const, cause: new Error("db fail") };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getPublicBusinessBySlugProgram", () => {
	it("returns business when slug matches", async () => {
		const business: TPublicBusiness = {
			id: "biz-1",
			name: "Happy Pets",
			slug: "happy-pets",
			logoUrl: null,
		};
		const { mock, layer } = makeLayer({
			getBusinessBySlug: vi.fn().mockReturnValue(Effect.succeed(business)),
		});

		const result = await Effect.runPromise(
			getPublicBusinessBySlugProgram("happy-pets").pipe(Effect.provide(layer)),
		);

		expect(result).toEqual(business);
		expect(mock.getBusinessBySlug).toHaveBeenCalledWith("happy-pets");
	});

	it("returns null when slug does not exist", async () => {
		const { layer } = makeLayer({
			getBusinessBySlug: vi.fn().mockReturnValue(Effect.succeed(null)),
		});

		const result = await Effect.runPromise(
			getPublicBusinessBySlugProgram("nonexistent").pipe(Effect.provide(layer)),
		);

		expect(result).toBeNull();
	});

	it("propagates DatabaseError when repo fails", async () => {
		const { layer } = makeLayer({
			getBusinessBySlug: vi.fn().mockReturnValue(Effect.fail(dbError)),
		});

		await expect(
			Effect.runPromise(
				getPublicBusinessBySlugProgram("error").pipe(Effect.provide(layer)),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getPublicBranchesProgram", () => {
	it("returns branches for a business", async () => {
		const branches: readonly TPublicBranch[] = [
			{
				id: "br-1",
				businessId: "biz-1",
				name: "Downtown",
				address: "Jl. Merdeka",
				phone: "021-1234",
				capacity: 20,
				isActive: true,
			},
		];
		const { mock, layer } = makeLayer({
			getBranches: vi.fn().mockReturnValue(Effect.succeed(branches)),
		});

		const result = await Effect.runPromise(
			getPublicBranchesProgram("biz-1").pipe(Effect.provide(layer)),
		);

		expect(result).toEqual(branches);
		expect(mock.getBranches).toHaveBeenCalledWith("biz-1");
	});

	it("returns empty array when business has no branches", async () => {
		const { layer } = makeLayer({
			getBranches: vi.fn().mockReturnValue(Effect.succeed([])),
		});

		const result = await Effect.runPromise(
			getPublicBranchesProgram("biz-empty").pipe(Effect.provide(layer)),
		);

		expect(result).toEqual([]);
	});

	it("propagates DatabaseError when repo fails", async () => {
		const { layer } = makeLayer({
			getBranches: vi.fn().mockReturnValue(Effect.fail(dbError)),
		});

		await expect(
			Effect.runPromise(
				getPublicBranchesProgram("biz-1").pipe(Effect.provide(layer)),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getPublicRoomsProgram", () => {
	it("returns rooms for a business", async () => {
		const rooms: readonly TPublicRoom[] = [
			{
				id: "rm-1",
				businessId: "biz-1",
				branchId: "br-1",
				name: "Standard Room",
				description: "Basic room",
				roomType: "standard",
				capacity: 2,
				dailyRate: 50000,
				isActive: true,
				occupied: 0,
				available: 2,
			},
		];
		const { mock, layer } = makeLayer({
			getRooms: vi.fn().mockReturnValue(Effect.succeed(rooms)),
		});

		const result = await Effect.runPromise(
			getPublicRoomsProgram("biz-1").pipe(Effect.provide(layer)),
		);

		expect(result).toEqual(rooms);
		expect(mock.getRooms).toHaveBeenCalledWith("biz-1");
	});

	it("returns empty array when business has no rooms", async () => {
		const { layer } = makeLayer({
			getRooms: vi.fn().mockReturnValue(Effect.succeed([])),
		});

		const result = await Effect.runPromise(
			getPublicRoomsProgram("biz-empty").pipe(Effect.provide(layer)),
		);

		expect(result).toEqual([]);
	});

	it("propagates DatabaseError when repo fails", async () => {
		const { layer } = makeLayer({
			getRooms: vi.fn().mockReturnValue(Effect.fail(dbError)),
		});

		await expect(
			Effect.runPromise(
				getPublicRoomsProgram("biz-1").pipe(Effect.provide(layer)),
			),
		).rejects.toThrow("DatabaseError");
	});
});

describe("getPublicProductProgram", () => {
	it("returns product when found", async () => {
		const product: TPublicProduct = {
			id: "prod-1",
			businessId: "biz-1",
			name: "Dog Food Premium",
			description: "High-quality dog food",
			price: 85000,
			imageUrl: null,
			category: "food",
			isActive: true,
			sku: "DF-001",
			stock: 50,
			unit: "kg",
		};
		const { mock, layer } = makeLayer({
			getProduct: vi.fn().mockReturnValue(Effect.succeed(product)),
		});

		const result = await Effect.runPromise(
			getPublicProductProgram("biz-1", "prod-1").pipe(Effect.provide(layer)),
		);

		expect(result).toEqual(product);
		expect(mock.getProduct).toHaveBeenCalledWith("biz-1", "prod-1");
	});

	it("returns null when product not found", async () => {
		const { layer } = makeLayer({
			getProduct: vi.fn().mockReturnValue(Effect.succeed(null)),
		});

		const result = await Effect.runPromise(
			getPublicProductProgram("biz-1", "nonexistent").pipe(
				Effect.provide(layer),
			),
		);

		expect(result).toBeNull();
	});

	it("propagates DatabaseError when repo fails", async () => {
		const { layer } = makeLayer({
			getProduct: vi.fn().mockReturnValue(Effect.fail(dbError)),
		});

		await expect(
			Effect.runPromise(
				getPublicProductProgram("biz-1", "prod-1").pipe(Effect.provide(layer)),
			),
		).rejects.toThrow("DatabaseError");
	});
});
