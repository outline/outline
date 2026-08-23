import { and, desc, eq, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	poItems,
	poReceivingItems,
	poReceivings,
	productBatches,
	productVariants,
	purchaseOrders,
	stockMovements,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { generateId, withRetry } from "@/shared/utils";
import { toPoItemDomain, toPurchaseOrderDomain } from "./purchase-order.dto";
import { IPurchaseOrderRepository } from "./purchase-order.repository";
import type { TPoItem, TPurchaseOrderWithItems } from "./purchase-order.types";

export const PurchaseOrderRepositoryDrizzle = Layer.effect(
	IPurchaseOrderRepository,
	Effect.map(IDrizzleClient, (db) =>
		IPurchaseOrderRepository.of({
			findAll: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(purchaseOrders)
								.where(eq(purchaseOrders.businessId, tenantId))
								.orderBy(desc(purchaseOrders.createdAt));
							return rows.map((row) =>
								toPurchaseOrderDomain({
									id: row.id,
									business_id: row.businessId,
									branch_id: row.branchId,
									supplier_id: row.supplierId,
									po_number: row.poNumber,
									status: row.status,
									total_amount: Number(row.totalAmount),
									notes: row.notes,
									order_date: new Date(row.orderDate).toISOString(),
									expected_date: row.expectedDate
										? new Date(row.expectedDate).toISOString()
										: null,
									created_by: row.createdBy ?? "",
									created_at: new Date(row.createdAt).toISOString(),
									updated_at: new Date(row.updatedAt).toISOString(),
								}),
							);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			findById: (id, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const poRows = await db
								.select()
								.from(purchaseOrders)
								.where(
									and(
										eq(purchaseOrders.id, id),
										eq(purchaseOrders.businessId, tenantId),
									),
								)
								.limit(1);

							const poRow = poRows[0];
							if (!poRow) return null;

							const itemRows = await db
								.select()
								.from(poItems)
								.where(eq(poItems.poId, poRow.id));

							const items = itemRows.map((row) =>
								toPoItemDomain({
									id: row.id,
									po_id: row.poId,
									variant_id: row.variantId as TPoItem["variantId"],
									qty_ordered: Number(row.qtyOrdered),
									qty_received: Number(row.qtyReceived),
									unit_cost: Number(row.unitCost),
									subtotal: Number(row.subtotal),
								}),
							);

							const po = toPurchaseOrderDomain({
								id: poRow.id,
								business_id: poRow.businessId,
								branch_id: poRow.branchId,
								supplier_id: poRow.supplierId,
								po_number: poRow.poNumber,
								status: poRow.status,
								total_amount: Number(poRow.totalAmount),
								notes: poRow.notes,
								order_date: new Date(poRow.orderDate).toISOString(),
								expected_date: poRow.expectedDate
									? new Date(poRow.expectedDate).toISOString()
									: null,
								created_by: poRow.createdBy ?? "",
								created_at: new Date(poRow.createdAt).toISOString(),
								updated_at: new Date(poRow.updatedAt).toISOString(),
							});

							return { ...po, items } as TPurchaseOrderWithItems;
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			saveOrderWithItems: (orderWithItems) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.transaction(async (tx) => {
								await tx.insert(purchaseOrders).values({
									id: orderWithItems.id,
									businessId: orderWithItems.tenantId,
									branchId: orderWithItems.branchId,
									supplierId: orderWithItems.supplierId,
									poNumber: orderWithItems.poNumber,
									status: orderWithItems.status,
									totalAmount: String(orderWithItems.totalAmount),
									notes: orderWithItems.notes,
									orderDate:
										orderWithItems.orderDate.toISOString().split("T")[0] ??
										new Date().toISOString().split("T")[0],
									expectedDate: orderWithItems.expectedDate
										? orderWithItems.expectedDate.toISOString().split("T")[0]
										: null,
									createdBy: orderWithItems.createdBy,
									createdAt: orderWithItems.createdAt.toISOString(),
									updatedAt: orderWithItems.updatedAt.toISOString(),
								});

								if (orderWithItems.items.length > 0) {
									await tx.insert(poItems).values(
										orderWithItems.items.map((item) => ({
											id: item.id,
											poId: item.poId,
											variantId: item.variantId,
											qtyOrdered: String(item.qtyOrdered),
											qtyReceived: String(item.qtyReceived),
											unitCost: String(item.unitCost),
											subtotal: String(item.subtotal),
										})),
									);
								}
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			updateOrderStatus: (id, tenantId, status) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(purchaseOrders)
								.set({
									status,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(purchaseOrders.id, id),
										eq(purchaseOrders.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			receivePurchaseOrder: (params, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const result = await db.transaction(async (tx) => {
								const poRows = await tx
									.select({
										id: purchaseOrders.id,
										businessId: purchaseOrders.businessId,
										status: purchaseOrders.status,
										poNumber: purchaseOrders.poNumber,
										supplierId: purchaseOrders.supplierId,
									})
									.from(purchaseOrders)
									.where(eq(purchaseOrders.id, params.poId))
									.for("update")
									.limit(1);

								const poRow = poRows[0];
								if (!poRow) {
									throw new Error(`Purchase order ${params.poId} not found`);
								}
								if (poRow.businessId !== tenantId) {
									throw new Error(
										`Purchase order ${params.poId} does not belong to business ${tenantId}`,
									);
								}
								if (
									poRow.status === "received" ||
									poRow.status === "cancelled"
								) {
									throw new Error(
										`Purchase order ${params.poId} is already ${poRow.status}`,
									);
								}

								await tx.insert(poReceivings).values({
									id: params.receivingId,
									poId: params.poId,
									receivedDate: params.receivedDate.toISOString(),
									notes: params.notes,
									receivedBy: params.receivedBy,
								});

								let allFully = true;
								for (const item of params.items) {
									// Lock the product_variants row FOR UPDATE so concurrent
									// receives of the same variant serialize through the row
									// lock and can never both observe the same stock count when
									// inserting batches + stock movements below.
									const variantRows = await tx
										.select({ id: productVariants.id })
										.from(productVariants)
										.where(
											and(
												eq(productVariants.id, item.variantId),
												eq(productVariants.businessId, tenantId),
											),
										)
										.for("update")
										.limit(1);

									if (variantRows.length === 0) {
										throw new Error(
											`Product variant ${item.variantId} not found for business ${tenantId}`,
										);
									}

									await tx.insert(poReceivingItems).values({
										id: item.id,
										receivingId: params.receivingId,
										poItemId: item.poItemId,
										qtyReceived: String(item.qtyReceived),
										expiryDate: item.expiryDate
											? item.expiryDate.toISOString().split("T")[0]
											: null,
										batchNumber: item.batchNumber,
									});

									await tx
										.update(poItems)
										.set({
											qtyReceived: sql`po_items.qty_received + ${item.qtyReceived}`,
										})
										.where(eq(poItems.id, item.poItemId));

									const poItemRows = await tx
										.select({
											qtyOrdered: poItems.qtyOrdered,
											qtyReceived: poItems.qtyReceived,
										})
										.from(poItems)
										.where(eq(poItems.id, item.poItemId))
										.limit(1);

									const poItemRow = poItemRows[0];
									if (!poItemRow) continue;

									const ordered = Number(poItemRow.qtyOrdered);
									const received = Number(poItemRow.qtyReceived);
									if (item.qtyReceived > 0 && received < ordered) {
										allFully = false;
									}

									const batchId = generateId();
									await tx.insert(productBatches).values({
										id: batchId,
										businessId: tenantId,
										variantId: item.variantId,
										batchNumber: item.batchNumber,
										quantity: String(item.qtyReceived),
										initialQty: String(item.qtyReceived),
										costPrice: String(item.unitCost),
										receivedAt: new Date().toISOString(),
										expiryDate: item.expiryDate
											? item.expiryDate.toISOString().split("T")[0]
											: null,
										supplierId: poRow.supplierId,
										poId: params.poId,
										notes: `Received from PO ${poRow.poNumber}`,
									});

									await tx.insert(stockMovements).values({
										businessId: tenantId,
										variantId: item.variantId,
										batchId,
										type: "in",
										quantity: String(item.qtyReceived),
										referenceType: "po",
										referenceId: params.poId,
										notes: `Received from PO ${poRow.poNumber}`,
										createdBy: params.receivedBy,
									});
								}

								const newStatus = allFully ? "received" : "partial";
								await tx
									.update(purchaseOrders)
									.set({
										status: newStatus,
										updatedAt: new Date().toISOString(),
									})
									.where(eq(purchaseOrders.id, params.poId));

								return {
									receivingId: params.receivingId,
									newStatus,
								};
							});

							return {
								receivingId: result.receivingId,
								newStatus: result.newStatus,
							};
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),
		}),
	),
);
