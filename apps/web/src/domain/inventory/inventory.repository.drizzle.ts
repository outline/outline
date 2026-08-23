import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import type { TProductVariantId } from "@/domain/product/product.types";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	productBatches,
	productVariants,
	stockMovements,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { InventoryRepository } from "./inventory.repository";
import type {
	TMovementType,
	TProductBatch,
	TProductBatchId,
	TPurchaseOrderId,
	TReferenceType,
	TStockMovement,
	TStockMovementId,
	TSupplierId,
} from "./inventory.types";

type TProductBatchRow = typeof productBatches.$inferSelect;
type TStockMovementRow = typeof stockMovements.$inferSelect;

const mapBatchRow = (row: TProductBatchRow): TProductBatch => ({
	id: row.id as TProductBatchId,
	tenantId: row.businessId as TTenantId,
	variantId: row.variantId as TProductVariantId,
	warehouseId: row.warehouseId,
	batchNumber: row.batchNumber,
	quantity: Number(row.quantity),
	initialQty: Number(row.initialQty),
	costPrice: Number(row.costPrice),
	receivedAt: new Date(row.receivedAt),
	expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
	supplierId: row.supplierId as TSupplierId | null,
	poId: row.poId as TPurchaseOrderId | null,
	notes: row.notes,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
});

const mapMovementRow = (row: TStockMovementRow): TStockMovement => ({
	id: row.id as TStockMovementId,
	tenantId: row.businessId as TTenantId,
	variantId: row.variantId as TProductVariantId,
	batchId: row.batchId as TProductBatchId | null,
	sourceWarehouseId: row.sourceWarehouseId,
	targetWarehouseId: row.targetWarehouseId,
	type: row.type as TMovementType,
	quantity: Number(row.quantity),
	referenceType: row.referenceType as TReferenceType | null,
	referenceId: row.referenceId,
	notes: row.notes,
	createdBy: row.createdBy,
	createdAt: new Date(row.createdAt),
});

export const InventoryRepositoryDrizzle = Layer.effect(
	InventoryRepository,
	Effect.map(IDrizzleClient, (db) =>
		InventoryRepository.of({
			addBatch: (params, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.transaction(async (tx) => {
								await tx
									.select({ id: productVariants.id })
									.from(productVariants)
									.where(
										and(
											eq(productVariants.id, params.variantId),
											eq(productVariants.businessId, tenantId),
										),
									)
									.for("update")
									.limit(1);

								await tx.insert(productBatches).values({
									id: params.batchId,
									businessId: tenantId,
									variantId: params.variantId,
									batchNumber: params.batchNumber,
									quantity: String(params.quantity),
									initialQty: String(params.quantity),
									costPrice: String(params.costPrice),
									receivedAt: new Date().toISOString(),
									expiryDate: params.expiryDate
										? params.expiryDate.toISOString().split("T")[0]
										: null,
									supplierId: params.supplierId,
									poId: params.poId,
									notes: params.notes,
								});

								await tx.insert(stockMovements).values({
									businessId: tenantId,
									variantId: params.variantId,
									batchId: params.batchId,
									type: "in",
									quantity: String(params.quantity),
									referenceType: params.poId ? "po" : "adjustment",
									referenceId: params.poId,
									notes: params.notes,
								});

								await tx
									.update(productVariants)
									.set({
										stock: sql`stock + ${String(params.quantity)}`,
										updatedAt: new Date().toISOString(),
									})
									.where(
										and(
											eq(productVariants.id, params.variantId),
											eq(productVariants.businessId, tenantId),
										),
									);
							});

							return { batchId: params.batchId };
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			deductStock: (params, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.transaction(async (tx) => {
								await tx
									.select({ id: productVariants.id })
									.from(productVariants)
									.where(
										and(
											eq(productVariants.id, params.variantId),
											eq(productVariants.businessId, tenantId),
										),
									)
									.for("update")
									.limit(1);

								for (const deduction of params.deductions) {
									await tx
										.update(productBatches)
										.set({
											quantity: sql`GREATEST(0, quantity - ${String(deduction.deductQty)})`,
											updatedAt: new Date().toISOString(),
										})
										.where(
											and(
												eq(productBatches.id, deduction.batchId),
												eq(productBatches.businessId, tenantId),
											),
										);

									await tx.insert(stockMovements).values({
										businessId: tenantId,
										variantId: params.variantId,
										batchId: deduction.batchId,
										type: "out",
										quantity: String(-deduction.deductQty),
										referenceType: params.referenceType,
										referenceId: params.referenceId || null,
										notes: params.notes,
									});
								}

								await tx
									.update(productVariants)
									.set({
										stock: sql`GREATEST(0, stock - ${String(params.totalQuantity)})`,
										updatedAt: new Date().toISOString(),
									})
									.where(
										and(
											eq(productVariants.id, params.variantId),
											eq(productVariants.businessId, tenantId),
										),
									);
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			findBatchesByVariant: (variantId, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(productBatches)
								.where(
									and(
										eq(productBatches.variantId, variantId),
										eq(productBatches.businessId, tenantId),
									),
								)
								.orderBy(desc(productBatches.receivedAt));

							return rows.map(mapBatchRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findBatchesWithStock: (variantId, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(productBatches)
								.where(
									and(
										eq(productBatches.variantId, variantId),
										eq(productBatches.businessId, tenantId),
										gt(productBatches.quantity, "0"),
									),
								)
								.orderBy(productBatches.receivedAt);

							return rows.map(mapBatchRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findExpiringBatches: (tenantId, days) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const targetDate = new Date();
							targetDate.setDate(targetDate.getDate() + days);
							const targetStr = targetDate.toISOString().split("T")[0];

							const rows = await db
								.select()
								.from(productBatches)
								.where(
									and(
										eq(productBatches.businessId, tenantId),
										gt(productBatches.quantity, "0"),
										isNotNull(productBatches.expiryDate),
										sql`${productBatches.expiryDate} <= ${targetStr}`,
									),
								)
								.orderBy(productBatches.expiryDate);

							return rows.map(mapBatchRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findMovementsByVariant: (variantId, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(stockMovements)
								.where(
									and(
										eq(stockMovements.variantId, variantId),
										eq(stockMovements.businessId, tenantId),
									),
								)
								.orderBy(desc(stockMovements.createdAt));

							return rows.map(mapMovementRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
