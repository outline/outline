import { Effect, Schema } from "effect";
import type { TProductVariantId } from "@/domain/product/product.types";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { computeFIFODeductions, createBatchEntity } from "./inventory.module";
import { InventoryRepository } from "./inventory.repository";
import { CreateBatchSchema, DeductStockSchema } from "./inventory.schemas";
import type { TProductBatch, TProductBatchId } from "./inventory.types";

export const getBatchesProgram = (
	tenantId: TTenantId,
	variantId: TProductVariantId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(InventoryRepository);
		return yield* _(repo.findBatchesByVariant(variantId, tenantId));
	});

export const getExpiringBatchesProgram = (
	tenantId: TTenantId,
	days: number = 30,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(InventoryRepository);
		return yield* _(repo.findExpiringBatches(tenantId, days));
	});

export const getMovementsProgram = (
	tenantId: TTenantId,
	variantId: TProductVariantId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(InventoryRepository);
		return yield* _(repo.findMovementsByVariant(variantId, tenantId));
	});

export const addBatchProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(InventoryRepository);
		const parsed = yield* _(Schema.decodeUnknown(CreateBatchSchema)(data));

		const batchEntity = yield* _(createBatchEntity(tenantId, parsed));
		const batchId = generateId<TProductBatchId>();

		const result = yield* _(
			repo.addBatch(
				{
					batchId,
					variantId: batchEntity.variantId,
					batchNumber: batchEntity.batchNumber,
					quantity: batchEntity.quantity,
					costPrice: batchEntity.costPrice,
					expiryDate: batchEntity.expiryDate,
					supplierId: batchEntity.supplierId,
					poId: batchEntity.poId,
					notes: batchEntity.notes,
				},
				tenantId,
			),
		);

		const now = new Date();
		return {
			...batchEntity,
			id: result.batchId as TProductBatchId,
			createdAt: now,
			updatedAt: now,
		} as TProductBatch;
	});

export const deductStockProgram = (tenantId: TTenantId, data: unknown) =>
	Effect.gen(function* (_) {
		const repo = yield* _(InventoryRepository);
		const parsed = yield* _(Schema.decodeUnknown(DeductStockSchema)(data));

		const variantId = parsed.variantId as TProductVariantId;
		const batches = yield* _(repo.findBatchesWithStock(variantId, tenantId));

		const deductions = yield* _(
			computeFIFODeductions(batches, parsed.quantity),
		);

		yield* _(
			repo.deductStock(
				{
					variantId,
					totalQuantity: parsed.quantity,
					referenceType: parsed.referenceType,
					referenceId: parsed.referenceId,
					notes: parsed.notes ?? null,
					deductions: deductions.map((d) => ({
						batchId: d.batch.id,
						deductQty: d.deductQty,
					})),
				},
				tenantId,
			),
		);

		return true;
	});
