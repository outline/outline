// @vitest-environment node
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TProductVariantId } from "@/domain/product/product.types";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	addBatchProgram,
	deductStockProgram,
	getBatchesProgram,
	getExpiringBatchesProgram,
	getMovementsProgram,
} from "./inventory.programs";
import { InventoryRepository } from "./inventory.repository";
import type { TProductBatch, TProductBatchId } from "./inventory.types";

describe("InventoryPrograms", () => {
	const tenantId = generateId<TTenantId>();
	const variantId = generateId<TProductVariantId>();

	const makeBatch = (
		overrides: Partial<TProductBatch> = {},
	): TProductBatch => ({
		id: generateId() as TProductBatchId,
		tenantId,
		variantId,
		batchNumber: null,
		quantity: 100,
		initialQty: 100,
		costPrice: 5000,
		receivedAt: new Date(),
		expiryDate: null,
		supplierId: null,
		poId: null,
		notes: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});

	const makeMovement = () => ({
		id: "mov-1",
		tenantId,
		variantId,
		batchId: null,
		type: "in" as const,
		quantity: 100,
		referenceType: null,
		referenceId: null,
		notes: null,
		createdBy: null,
		createdAt: new Date(),
	});

	const addBatchResult = { batchId: generateId() };
	const makeMockInventoryRepo = () => ({
		findBatchesByVariant: vi.fn(),
		findBatchesWithStock: vi.fn(),
		findExpiringBatches: vi.fn(),
		addBatch: vi.fn(() => Effect.succeed(addBatchResult)),
		deductStock: vi.fn<
			(...args: unknown[]) => Effect.Effect<void, DatabaseError>
		>(() => Effect.void as Effect.Effect<void, DatabaseError>),
		findMovementsByVariant: vi.fn(),
	});

	describe("getBatchesProgram", () => {
		it("should return batches for a variant", async () => {
			const batches = [makeBatch()];
			const mockRepo = makeMockInventoryRepo();
			mockRepo.findBatchesByVariant.mockReturnValue(Effect.succeed(batches));
			const layer = Layer.succeed(InventoryRepository, mockRepo);

			const result = await Effect.runPromise(
				getBatchesProgram(tenantId, variantId).pipe(Effect.provide(layer)),
			);

			expect(result).toHaveLength(1);
			expect(mockRepo.findBatchesByVariant).toHaveBeenCalledWith(
				variantId,
				tenantId,
			);
		});
	});

	describe("getExpiringBatchesProgram", () => {
		it("should return expiring batches with default days", async () => {
			const batches = [makeBatch()];
			const mockRepo = makeMockInventoryRepo();
			mockRepo.findExpiringBatches.mockReturnValue(Effect.succeed(batches));
			const layer = Layer.succeed(InventoryRepository, mockRepo);

			const result = await Effect.runPromise(
				getExpiringBatchesProgram(tenantId).pipe(Effect.provide(layer)),
			);

			expect(result).toHaveLength(1);
			expect(mockRepo.findExpiringBatches).toHaveBeenCalledWith(tenantId, 30);
		});

		it("should accept custom days parameter", async () => {
			const mockRepo = makeMockInventoryRepo();
			mockRepo.findExpiringBatches.mockReturnValue(Effect.succeed([]));
			const layer = Layer.succeed(InventoryRepository, mockRepo);

			await Effect.runPromise(
				getExpiringBatchesProgram(tenantId, 60).pipe(Effect.provide(layer)),
			);

			expect(mockRepo.findExpiringBatches).toHaveBeenCalledWith(tenantId, 60);
		});
	});

	describe("getMovementsProgram", () => {
		it("should return movements for a variant", async () => {
			const movements = [makeMovement()];
			const mockRepo = makeMockInventoryRepo();
			mockRepo.findMovementsByVariant.mockReturnValue(
				Effect.succeed(movements),
			);
			const layer = Layer.succeed(InventoryRepository, mockRepo);

			const result = await Effect.runPromise(
				getMovementsProgram(tenantId, variantId).pipe(Effect.provide(layer)),
			);

			expect(result).toHaveLength(1);
			expect(mockRepo.findMovementsByVariant).toHaveBeenCalledWith(
				variantId,
				tenantId,
			);
		});
	});

	describe("addBatchProgram", () => {
		const validInput = {
			variantId,
			batchNumber: "BATCH-001",
			quantity: 100,
			costPrice: 5000,
			expiryDate: null,
			supplierId: null as string | null,
			poId: null as string | null,
			notes: null as string | null,
		};

		it("should call addBatch RPC and return the batch entity", async () => {
			const mockInvRepo = makeMockInventoryRepo();
			const invLayer = Layer.succeed(InventoryRepository, mockInvRepo);

			const result = await Effect.runPromise(
				addBatchProgram(tenantId, validInput).pipe(Effect.provide(invLayer)),
			);

			expect(result).toBeDefined();
			expect(result.quantity).toBe(100);
			expect(result.id).toBeDefined();
			expect(mockInvRepo.addBatch).toHaveBeenCalledTimes(1);
			const callArg = (mockInvRepo.addBatch as ReturnType<typeof vi.fn>).mock
				.calls[0]?.[0];
			expect(callArg?.variantId).toBe(variantId);
			expect(callArg?.quantity).toBe(100);
			expect(callArg?.batchId).toBeDefined();
		});
	});

	describe("deductStockProgram", () => {
		const validInput = {
			variantId,
			quantity: 10,
			referenceType: "order" as const,
			referenceId: "order-123",
			notes: null,
		};

		it("should compute FIFO deductions and call deductStock RPC", async () => {
			const batch1 = makeBatch({
				id: generateId() as TProductBatchId,
				quantity: 5,
				receivedAt: new Date("2026-01-01"),
			});
			const batch2 = makeBatch({
				id: generateId() as TProductBatchId,
				quantity: 10,
				receivedAt: new Date("2026-02-01"),
			});

			const mockInvRepo = makeMockInventoryRepo();
			mockInvRepo.findBatchesWithStock.mockReturnValue(
				Effect.succeed([batch1, batch2]),
			);

			const invLayer = Layer.succeed(InventoryRepository, mockInvRepo);

			const result = await Effect.runPromise(
				deductStockProgram(tenantId, validInput).pipe(Effect.provide(invLayer)),
			);

			expect(result).toBe(true);
			expect(mockInvRepo.deductStock).toHaveBeenCalledTimes(1);
			const callArg = (mockInvRepo.deductStock as ReturnType<typeof vi.fn>).mock
				.calls[0]?.[0];
			expect(callArg?.deductions).toHaveLength(2);
			expect(callArg?.deductions[0]?.batchId).toBe(batch1.id);
			expect(callArg?.deductions[0]?.deductQty).toBe(5);
			expect(callArg?.deductions[1]?.batchId).toBe(batch2.id);
			expect(callArg?.deductions[1]?.deductQty).toBe(5);
			expect(callArg?.totalQuantity).toBe(10);
		});

		it("should fail with InsufficientStockError when stock is low", async () => {
			const batch1 = makeBatch({ quantity: 3 });

			const mockInvRepo = makeMockInventoryRepo();
			mockInvRepo.findBatchesWithStock.mockReturnValue(
				Effect.succeed([batch1]),
			);

			const invLayer = Layer.succeed(InventoryRepository, mockInvRepo);

			const result = await Effect.runSyncExit(
				deductStockProgram(tenantId, {
					...validInput,
					quantity: 10,
				}).pipe(Effect.provide(invLayer)),
			);

			expect(result._tag).toBe("Failure");
		});

		it("should propagate DatabaseError from deductStock RPC", async () => {
			const dbErr = new DatabaseError({ cause: new Error("rpc fail") });
			const batch1 = makeBatch({ quantity: 10 });

			const mockInvRepo = makeMockInventoryRepo();
			mockInvRepo.findBatchesWithStock.mockReturnValue(
				Effect.succeed([batch1]),
			);
			mockInvRepo.deductStock = vi.fn(() => Effect.fail(dbErr));

			const invLayer = Layer.succeed(InventoryRepository, mockInvRepo);

			await expect(
				Effect.runPromise(
					deductStockProgram(tenantId, validInput).pipe(
						Effect.provide(invLayer),
					),
				),
			).rejects.toMatchObject({
				name: expect.stringContaining("DatabaseError"),
			});
		});
	});
});
