import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { TProductVariantId } from "@/domain/product/product.types";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import {
	computeFIFODeductions,
	createBatchEntity,
	createMovementEntity,
} from "./inventory.module";
import type {
	TProductBatch,
	TProductBatchId,
	TPurchaseOrderId,
	TSupplierId,
} from "./inventory.types";

describe("InventoryModule", () => {
	const tenantId = generateId<TTenantId>();
	const variantId = generateId<TProductVariantId>();
	const supplierId = "supplier-1" as TSupplierId;
	const poId = "po-1" as TPurchaseOrderId;

	describe("createBatchEntity", () => {
		it("should create a batch entity from valid data", () => {
			const data = {
				variantId,
				batchNumber: "BATCH-001",
				quantity: 100,
				costPrice: 5000,
				expiryDate: new Date("2027-06-20"),
				supplierId,
				poId,
				notes: "Initial stock",
			};

			const result = Effect.runSync(createBatchEntity(tenantId, data));

			expect(result.tenantId).toBe(tenantId);
			expect(result.variantId).toBe(variantId);
			expect(result.batchNumber).toBe("BATCH-001");
			expect(result.quantity).toBe(100);
			expect(result.initialQty).toBe(100);
			expect(result.costPrice).toBe(5000);
			expect(result.receivedAt).toBeInstanceOf(Date);
			expect(result.expiryDate).toBeInstanceOf(Date);
			expect(result.supplierId).toBe(supplierId);
			expect(result.poId).toBe(poId);
			expect(result.notes).toBe("Initial stock");
		});

		it("should handle optional fields as null", () => {
			const data = {
				variantId,
				batchNumber: null,
				quantity: 50,
				costPrice: 3000,
				expiryDate: null,
				supplierId: null,
				poId: null,
			};

			const result = Effect.runSync(createBatchEntity(tenantId, data));

			expect(result.batchNumber).toBeNull();
			expect(result.expiryDate).toBeNull();
			expect(result.supplierId).toBeNull();
			expect(result.poId).toBeNull();
			expect(result.notes).toBeNull();
		});
	});

	describe("createMovementEntity", () => {
		it("should create an 'in' movement", () => {
			const batchId = generateId() as TProductBatchId;
			const result = Effect.runSync(
				createMovementEntity(
					tenantId,
					variantId,
					batchId,
					"in",
					100,
					"po",
					"po-1",
					"Batch addition",
				),
			);

			expect(result.tenantId).toBe(tenantId);
			expect(result.variantId).toBe(variantId);
			expect(result.batchId).toBe(batchId);
			expect(result.type).toBe("in");
			expect(result.quantity).toBe(100);
			expect(result.referenceType).toBe("po");
			expect(result.referenceId).toBe("po-1");
			expect(result.notes).toBe("Batch addition");
		});

		it("should create an 'out' movement with negative quantity", () => {
			const result = Effect.runSync(
				createMovementEntity(
					tenantId,
					variantId,
					null,
					"out",
					-5,
					"order",
					"order-1",
					"Sale deduction",
				),
			);

			expect(result.type).toBe("out");
			expect(result.quantity).toBe(-5);
			expect(result.referenceType).toBe("order");
			expect(result.batchId).toBeNull();
		});

		it("should create adjustment and transfer movements", () => {
			const adjustment = Effect.runSync(
				createMovementEntity(
					tenantId,
					variantId,
					null,
					"adjustment",
					10,
					"adjustment",
					null,
					"Stock opname",
				),
			);
			expect(adjustment.type).toBe("adjustment");
			expect(adjustment.referenceType).toBe("adjustment");

			const transfer = Effect.runSync(
				createMovementEntity(
					tenantId,
					variantId,
					null,
					"transfer",
					-10,
					"transfer",
					"transfer-1",
					"Transfer out",
				),
			);
			expect(transfer.type).toBe("transfer");
			expect(transfer.referenceType).toBe("transfer");
		});
	});

	describe("computeFIFODeductions", () => {
		const makeBatch = (
			id: string,
			quantity: number,
			receivedAt: Date,
		): TProductBatch => ({
			id: id as TProductBatchId,
			tenantId,
			variantId,
			batchNumber: null,
			quantity,
			initialQty: quantity,
			costPrice: 5000,
			receivedAt,
			expiryDate: null,
			supplierId: null,
			poId: null,
			notes: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		it("should deduct from earliest batch first", () => {
			const batches = [
				makeBatch("batch-1", 10, new Date("2026-01-01")),
				makeBatch("batch-2", 20, new Date("2026-02-01")),
				makeBatch("batch-3", 30, new Date("2026-03-01")),
			];

			const result = Effect.runSync(computeFIFODeductions(batches, 25));

			expect(result).toHaveLength(2);
			expect(result[0]?.batch.id).toBe("batch-1" as TProductBatchId);
			expect(result[0]?.deductQty).toBe(10);
			expect(result[1]?.batch.id).toBe("batch-2" as TProductBatchId);
			expect(result[1]?.deductQty).toBe(15);
		});

		it("should deduct from single batch if sufficient", () => {
			const batches = [makeBatch("batch-1", 50, new Date("2026-01-01"))];

			const result = Effect.runSync(computeFIFODeductions(batches, 30));

			expect(result).toHaveLength(1);
			expect(result[0]?.deductQty).toBe(30);
		});

		it("should deduct exactly remaining quantity across batches", () => {
			const batches = [
				makeBatch("batch-1", 5, new Date("2026-01-01")),
				makeBatch("batch-2", 5, new Date("2026-02-01")),
				makeBatch("batch-3", 5, new Date("2026-03-01")),
			];

			const result = Effect.runSync(computeFIFODeductions(batches, 15));

			expect(result).toHaveLength(3);
			expect(result[0]?.deductQty).toBe(5);
			expect(result[1]?.deductQty).toBe(5);
			expect(result[2]?.deductQty).toBe(5);
		});

		it("should fail with InsufficientStockError when stock is insufficient", () => {
			const batches = [
				makeBatch("batch-1", 3, new Date("2026-01-01")),
				makeBatch("batch-2", 2, new Date("2026-02-01")),
			];

			const result = Effect.runSyncExit(computeFIFODeductions(batches, 10));

			expect(result._tag).toBe("Failure");
		});

		it("should fail with InsufficientStockError when batches are empty", () => {
			const result = Effect.runSyncExit(computeFIFODeductions([], 1));

			expect(result._tag).toBe("Failure");
		});
	});
});
