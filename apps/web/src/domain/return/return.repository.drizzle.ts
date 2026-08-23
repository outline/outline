import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import type { TOrderId, TOrderItemId } from "@/domain/order/order.types";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	orderItems,
	productVariants,
	returnItems,
	returns,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { IReturnRepository } from "./return.repository";
import type {
	TReturnId,
	TReturnItemId,
	TReturnStatus,
	TReturnWithItems,
} from "./return.types";

type TReturnRow = typeof returns.$inferSelect;
type TReturnItemRow = typeof returnItems.$inferSelect;

const mapReturnItemRow = (
	row: TReturnItemRow,
): TReturnWithItems["items"][number] => ({
	id: row.id as TReturnItemId,
	returnId: row.returnId as TReturnId,
	orderItemId: row.orderItemId as TOrderItemId,
	qty: Number(row.qty),
	reason: row.reason,
	isDamaged: row.isDamaged,
});

const mapReturnRow = (
	row: TReturnRow,
	items: TReturnWithItems["items"],
): TReturnWithItems => ({
	id: row.id as TReturnId,
	tenantId: row.businessId as TTenantId,
	orderId: row.orderId as TOrderId,
	status: row.status as TReturnStatus,
	refundMethod: row.refundMethod,
	refundAmount: Number(row.refundAmount),
	reason: row.reason,
	createdBy: row.createdBy as TUserId,
	createdAt: new Date(row.createdAt),
	updatedAt: new Date(row.updatedAt),
	items,
});

export const ReturnRepositoryDrizzle = Layer.effect(
	IReturnRepository,
	Effect.map(IDrizzleClient, (db) =>
		IReturnRepository.of({
			findAll: (tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(returns)
								.where(eq(returns.businessId, tenantId))
								.orderBy(desc(returns.createdAt));

							if (rows.length === 0) {
								return [] as readonly TReturnWithItems[];
							}

							const returnIds = rows.map((r) => r.id);
							const itemRows = await db
								.select()
								.from(returnItems)
								.where(inArray(returnItems.returnId, returnIds));

							const itemsByReturn = new Map<string, TReturnItemRow[]>();
							for (const item of itemRows) {
								const list = itemsByReturn.get(item.returnId) ?? [];
								list.push(item);
								itemsByReturn.set(item.returnId, list);
							}

							return rows.map((row) =>
								mapReturnRow(
									row,
									(itemsByReturn.get(row.id) ?? []).map(mapReturnItemRow),
								),
							);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			processReturn: (returnWithItems) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.transaction(async (tx) => {
								await tx.insert(returns).values({
									id: returnWithItems.id,
									businessId: returnWithItems.tenantId,
									orderId: returnWithItems.orderId,
									status: "completed",
									refundMethod: returnWithItems.refundMethod,
									refundAmount: String(returnWithItems.refundAmount),
									reason: returnWithItems.reason,
									createdBy: returnWithItems.createdBy,
									createdAt: returnWithItems.createdAt.toISOString(),
									updatedAt: returnWithItems.updatedAt.toISOString(),
								});

								if (returnWithItems.items.length > 0) {
									await tx.insert(returnItems).values(
										returnWithItems.items.map((item) => ({
											id: item.id,
											returnId: returnWithItems.id,
											orderItemId: item.orderItemId,
											qty: String(item.qty),
											reason: item.reason,
											isDamaged: item.isDamaged,
										})),
									);

									for (const item of returnWithItems.items) {
										if (item.isDamaged) continue;

										const orderItemRows = await tx
											.select({ variantId: orderItems.variantId })
											.from(orderItems)
											.where(eq(orderItems.id, item.orderItemId))
											.limit(1);

										const variantId = orderItemRows[0]?.variantId;
										if (!variantId) continue;

										const variantLock = await tx
											.select({ id: productVariants.id })
											.from(productVariants)
											.where(
												and(
													eq(productVariants.id, variantId),
													eq(
														productVariants.businessId,
														returnWithItems.tenantId,
													),
												),
											)
											.for("update")
											.limit(1);

										if (variantLock.length === 0) continue;

										await tx
											.update(productVariants)
											.set({
												stock: sql`stock + ${String(item.qty)}`,
												updatedAt: new Date().toISOString(),
											})
											.where(
												and(
													eq(productVariants.id, variantId),
													eq(
														productVariants.businessId,
														returnWithItems.tenantId,
													),
												),
											);
									}
								}
							});

							return returnWithItems.id;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
