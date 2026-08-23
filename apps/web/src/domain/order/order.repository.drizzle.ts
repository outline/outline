import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TProductId } from "@/domain/product/product.types";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	auditLogs,
	customers,
	orderItems,
	orders,
	products,
	productVariants,
	stockMovements,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId, withRetry } from "@/shared/utils";
import {
	InvalidStatusTransitionError,
	OrderAlreadyVoidedError,
	OrderNotFoundError,
} from "./order.errors";
import {
	IOrderRepository,
	type TOrderListFilters,
	type TOrderListResult,
} from "./order.repository";
import type {
	TDiscountType,
	TOrderId,
	TOrderItem,
	TOrderItemId,
	TOrderStatus,
	TOrderTracking,
	TOrderWithItems,
	TPaymentMethod,
} from "./order.types";

type TOrderRow = typeof orders.$inferSelect;
type TOrderItemRow = typeof orderItems.$inferSelect;

const mapOrderItemRow = (item: TOrderItemRow): TOrderItem => ({
	id: item.id as TOrderItemId,
	orderId: item.orderId as TOrderId,
	productId: item.productId as TProductId,
	quantity: Number(item.quantity),
	priceAtTime: Number(item.priceAtTime),
	discountType: item.discountType as TDiscountType | null,
	discountValue: Number(item.discountValue),
	discountAmount: Number(item.discountAmount),
});

const mapOrderRow = (
	row: TOrderRow,
	items: readonly TOrderItem[],
): TOrderWithItems => ({
	id: row.id as TOrderId,
	tenantId: row.businessId as TTenantId,
	branchId: row.branchId as TBranchId,
	customerId: row.customerId as TCustomerId | null,
	totalAmount: Number(row.totalAmount),
	paymentMethod: row.paymentMethod as TPaymentMethod,
	status: row.status as TOrderStatus,
	discountType: row.discountType as TDiscountType | null,
	discountValue: Number(row.discountValue),
	discountAmount: Number(row.discountAmount),
	voucherCode: row.voucherCode,
	voucherDiscount: Number(row.voucherDiscount),
	voidedAt: row.voidedAt ? new Date(row.voidedAt) : null,
	voidedBy: row.voidedBy as TUserId | null,
	voidedReason: row.voidedReason,
	createdBy: row.createdBy as TUserId,
	createdAt: new Date(row.createdAt),
	trackingNumber: row.trackingNumber,
	shippingCarrier: row.shippingCarrier,
	shippedAt: row.shippedAt,
	deliveredAt: row.deliveredAt,
	cancelledAt: row.cancelledAt,
	cancelledReason: row.cancelledReason,
	cancelledBy: row.cancelledBy as TUserId | null,
	items,
});

export const OrderRepositoryDrizzle = Layer.effect(
	IOrderRepository,
	Effect.map(IDrizzleClient, (db) =>
		IOrderRepository.of({
			findById: (id: TOrderId, tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const result = await db.query.orders.findFirst({
								where: {
									RAW: (orders, { and, eq }) =>
										and(eq(orders.id, id), eq(orders.businessId, tenantId)) ?? sql``,
								},
							});

							if (!result) return null;

							const itemRows = await db
								.select()
								.from(orderItems)
								.where(eq(orderItems.orderId, result.id));

							return mapOrderRow(result, itemRows.map(mapOrderItemRow));
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findByCustomerId: (
				customerId: string,
				tenantId: TTenantId,
				options?: { limit?: number; offset?: number },
			): Effect.Effect<TOrderListResult, DatabaseError> =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const baseWhere = and(
								eq(orders.businessId, tenantId),
								eq(orders.customerId, customerId),
							);

							const [results, totalRows] = await Promise.all([
								db.query.orders.findMany({
									where: { RAW: () => baseWhere ?? sql`` },
									orderBy: (orders, { desc }) => desc(orders.createdAt),
									limit: options?.limit,
									offset: options?.offset,
								}),
								db
									.select({ count: sql<number>`count(*)::int` })
									.from(orders)
									.where(baseWhere),
							]);

							const total = totalRows[0]?.count ?? 0;
							if (results.length === 0) {
								return { orders: [], total };
							}

							const orderIds = results.map((r) => r.id);
							const itemRows = await db
								.select()
								.from(orderItems)
								.where(inArray(orderItems.orderId, orderIds));

							const itemsByOrder = new Map<string, TOrderItemRow[]>();
							for (const item of itemRows) {
								const list = itemsByOrder.get(item.orderId) ?? [];
								list.push(item);
								itemsByOrder.set(item.orderId, list);
							}

							const mapped = results.map((d) =>
								mapOrderRow(
									d,
									(itemsByOrder.get(d.id) ?? []).map(mapOrderItemRow),
								),
							);

							return { orders: mapped, total };
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findAll: (
				tenantId: TTenantId,
				options?: TOrderListFilters,
			): Effect.Effect<TOrderListResult, DatabaseError> =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const filters: ReturnType<typeof eq>[] = [
								eq(orders.businessId, tenantId),
							];

							if (options?.status) {
								filters.push(eq(orders.status, options.status));
							}
							if (options?.fromDate) {
								filters.push(
									gte(orders.createdAt, options.fromDate.toISOString()),
								);
							}
							if (options?.toDate) {
								filters.push(
									lte(orders.createdAt, options.toDate.toISOString()),
								);
							}

							if (options?.phone) {
								const stripped = options.phone.replace(/\D/g, "");
								const matchingCustomers = await db
									.select({ id: customers.id })
									.from(customers)
									.where(
										and(
											eq(customers.businessId, tenantId),
											sql`regexp_replace(${customers.phone}, '[^0-9]', '', 'g') LIKE ${"%" + stripped + "%"}`,
										),
									);

								if (matchingCustomers.length === 0) {
									return { orders: [], total: 0 };
								}

								filters.push(
									inArray(
										orders.customerId,
										matchingCustomers.map((c) => c.id),
									),
								);
							}

							const whereClause =
								filters.length > 0 ? and(...filters) : undefined;

							const [results, totalRows] = await Promise.all([
								db.query.orders.findMany({
									where: { RAW: () => whereClause ?? sql`` },
									orderBy: (orders, { desc }) => desc(orders.createdAt),
									limit: options?.limit,
									offset: options?.offset,
								}),
								db
									.select({ count: sql<number>`count(*)::int` })
									.from(orders)
									.where(whereClause),
							]);

							const total = totalRows[0]?.count ?? 0;

							if (results.length === 0) {
								return { orders: [], total };
							}

							const orderIds = results.map((r) => r.id);
							const itemRows = await db
								.select()
								.from(orderItems)
								.where(inArray(orderItems.orderId, orderIds));

							const itemsByOrder = new Map<string, TOrderItemRow[]>();
							for (const item of itemRows) {
								const list = itemsByOrder.get(item.orderId) ?? [];
								list.push(item);
								itemsByOrder.set(item.orderId, list);
							}

							const mapped = results.map((d) =>
								mapOrderRow(
									d,
									(itemsByOrder.get(d.id) ?? []).map(mapOrderItemRow),
								),
							);

							return { orders: mapped, total };
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			saveFull: (orderWithItems: TOrderWithItems) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							// NATIVE TRANSACTION — ACID compliant!
							//
							// Everything inside this transaction either commits
							// together or rolls back together:
							//   1. orders row insert (including voucher fields)
							//   2. order_items bulk insert
							//   3. Stock deduction — variant products decrement
							//      product_variants.stock (not products.stock) under
							//      optimistic locking on `version`. Non-variant
							//      products decrement products.stock the same way.
							//   4. Per-item stock_movements row so the deduction is
							//      discoverable / reversible for void.
							//   5. audit_logs row tagged "order_create" so the
							//      timeline endpoint shows the create event.
							await db.transaction(async (tx) => {
								await tx.insert(orders).values({
									id: orderWithItems.id,
									businessId: orderWithItems.tenantId,
									branchId: orderWithItems.branchId,
									totalAmount: orderWithItems.totalAmount.toString(),
									paymentMethod: orderWithItems.paymentMethod,
									createdBy: orderWithItems.createdBy,
									voucherCode: orderWithItems.voucherCode,
									voucherDiscount: orderWithItems.voucherDiscount.toString(),
								});

								if (orderWithItems.items.length > 0) {
									await tx.insert(orderItems).values(
										orderWithItems.items.map((item) => ({
											id: item.id,
											orderId: orderWithItems.id,
											productId: item.productId,
											quantity: item.quantity.toString(),
											priceAtTime: item.priceAtTime.toString(),
											...(item.variantId !== undefined &&
											item.variantId !== null
												? { variantId: item.variantId }
												: {}),
										})),
									);

									const movementRows: (typeof stockMovements.$inferInsert)[] =
										[];

									for (const item of orderWithItems.items) {
										if (item.variantId) {
											// Variant products — read variant row, check stock,
											// deduct with optimistic lock, write movement row.
											const [variant] = await tx
												.select()
												.from(productVariants)
												.where(
													and(
														eq(productVariants.id, item.variantId),
														eq(
															productVariants.businessId,
															orderWithItems.tenantId,
														),
													),
												)
												.limit(1);

											if (!variant) {
												throw new Error(`Variant ${item.variantId} not found`);
											}

											const before = Number(variant.stock);
											if (before < item.quantity) {
												throw new Error(
													`Insufficient stock for variant ${item.variantId}`,
												);
											}

											const updateResult = await tx
												.update(productVariants)
												.set({
													stock: (before - item.quantity).toString(),
													version: variant.version + 1,
												})
												.where(
													and(
														eq(productVariants.id, item.variantId),
														eq(productVariants.version, variant.version),
													),
												);

											if (updateResult.rowCount === 0) {
												throw new Error(
													`Concurrent modification on variant ${item.variantId}`,
												);
											}

											movementRows.push({
												businessId: orderWithItems.tenantId,
												variantId: item.variantId,
												type: "out",
												quantity: (-item.quantity).toString(),
												referenceType: "order_create",
												referenceId: orderWithItems.id,
												notes: `Order ${orderWithItems.id} placed`,
												createdBy: orderWithItems.createdBy,
												createdAt: new Date().toISOString(),
											});
										} else {
											// Non-variant product — deduct parent stock.
											const [prod] = await tx
												.select()
												.from(products)
												.where(
													and(
														eq(products.id, item.productId),
														eq(products.businessId, orderWithItems.tenantId),
													),
												)
												.limit(1);

											if (!prod) {
												throw new Error(`Product ${item.productId} not found`);
											}
											if (prod.stock < item.quantity) {
												throw new Error(
													`Insufficient stock for product ${item.productId}`,
												);
											}

											const updateResult = await tx
												.update(products)
												.set({
													stock: prod.stock - item.quantity,
													version: prod.version + 1,
												})
												.where(
													and(
														eq(products.id, item.productId),
														eq(products.version, prod.version),
													),
												);

											if (updateResult.rowCount === 0) {
												throw new Error(
													`Concurrent modification on product ${item.productId}`,
												);
											}

											// Movements row with NULL variant_id — variant_id
											// was relaxed to nullable in migration 0009 for
											// parent-level tracking.
											movementRows.push({
												businessId: orderWithItems.tenantId,
												variantId: null,
												type: "out",
												quantity: (-item.quantity).toString(),
												referenceType: "order_create",
												referenceId: orderWithItems.id,
												notes: `Order ${orderWithItems.id} placed`,
												createdBy: orderWithItems.createdBy,
												createdAt: new Date().toISOString(),
											});
										}
									}

									if (movementRows.length > 0) {
										await tx.insert(stockMovements).values(movementRows);
									}
								}

								// Order create audit (Fix 6 in audit).
								await tx.insert(auditLogs).values({
									id: generateId(),
									businessId: orderWithItems.tenantId,
									userId: orderWithItems.createdBy,
									action: "create",
									entityType: "order",
									entityId: orderWithItems.id,
									newValue: {
										totalAmount: orderWithItems.totalAmount,
										status: orderWithItems.status,
										voucherCode: orderWithItems.voucherCode,
										voucherDiscount: orderWithItems.voucherDiscount,
									},
									createdAt: new Date().toISOString(),
								});
							});
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateStatus: (
				orderId: TOrderId,
				tenantId: TTenantId,
				status:
					| "draft"
					| "confirmed"
					| "processing"
					| "shipped"
					| "delivered"
					| "cancelled",
				tracking?: TOrderTracking,
				actorId?: import("@/shared/types/common.types").TUserId,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const now = new Date();
							const updateData: Record<string, unknown> = {
								status,
								version: sql`${orders.version} + 1`,
							};

							if (status === "shipped") {
								updateData.trackingNumber = tracking?.trackingNumber;
								updateData.shippingCarrier = tracking?.shippingCarrier;
								updateData.shippedAt = now.toISOString();
							}
							if (status === "delivered") {
								updateData.deliveredAt = now.toISOString();
							}
							if (status === "cancelled") {
								updateData.cancelledAt = now.toISOString();
								updateData.cancelledReason = tracking?.cancelledReason;
								if (actorId) updateData.cancelledBy = actorId;
							}

							const updateResult = await db
								.update(orders)
								.set(updateData)
								.where(
									and(eq(orders.id, orderId), eq(orders.businessId, tenantId)),
								)
								.returning();

							if (updateResult.length === 0) {
								throw new OrderNotFoundError({ id: orderId });
							}

							const itemRows = await db
								.select()
								.from(orderItems)
								.where(eq(orderItems.orderId, orderId));

							if (actorId) {
								await db.insert(auditLogs).values({
									id: generateId(),
									businessId: tenantId,
									userId: actorId,
									action: "update",
									entityType: "order",
									entityId: orderId,
									newValue: { status, ...(tracking ? { tracking } : {}) },
									createdAt: new Date().toISOString(),
								});
							}

							const updated = updateResult[0] as NonNullable<
								(typeof updateResult)[0]
							>;
							return mapOrderRow(updated, itemRows.map(mapOrderItemRow));
						},
						catch: (e) => {
							if (e instanceof OrderNotFoundError) return e;
							if (e instanceof InvalidStatusTransitionError) return e;
							return new DatabaseError({ cause: e });
						},
					}),
				),

			voidOrder: (
				orderId: TOrderId,
				tenantId: TTenantId,
				voidedBy: import("@/shared/types/common.types").TUserId,
				reason: string,
			): Effect.Effect<
				void,
				DatabaseError | OrderNotFoundError | OrderAlreadyVoidedError
			> =>
				withRetry(
					Effect.async<
						void,
						DatabaseError | OrderNotFoundError | OrderAlreadyVoidedError
					>((resume) => {
						(async () => {
							// ACID atomic void:
							//   1. Lock the order row with FOR UPDATE so a second
							//      concurrent void call can't double-restore stock.
							//   2. Bail out cleanly with a typed error if the order is
							//      missing or already voided.
							//   3. Mark orders.voided_* + status='voided'.
							//   4. For each item: restore variant OR parent stock using
							//      optimistic locking, and insert a compensating
							//      stock_movements row (referenceType='order_void').
							//   5. Write an audit_logs row so the timeline endpoint
							//      surfaces the void event.
							try {
								await db.transaction(async (tx) => {
									const [orderRow] = await tx
										.select()
										.from(orders)
										.where(
											and(
												eq(orders.id, orderId),
												eq(orders.businessId, tenantId),
											),
										)
										.limit(1)
										.for("update");

									if (!orderRow) {
										throw new OrderNotFoundError({ id: orderId });
									}
									if (orderRow.voidedAt) {
										throw new OrderAlreadyVoidedError({ id: orderId });
									}

									const voidedAtIso = new Date().toISOString();
									await tx
										.update(orders)
										.set({
											status: "voided",
											voidedAt: voidedAtIso,
											voidedBy,
											voidedReason: reason,
										})
										.where(eq(orders.id, orderId));

									const items = await tx
										.select()
										.from(orderItems)
										.where(eq(orderItems.orderId, orderId));

									const movementRows: (typeof stockMovements.$inferInsert)[] =
										[];
									for (const item of items) {
										if (item.variantId) {
											const [variant] = await tx
												.select()
												.from(productVariants)
												.where(eq(productVariants.id, item.variantId))
												.limit(1);

											if (variant) {
												const updateResult = await tx
													.update(productVariants)
													.set({
														stock: (
															Number(variant.stock) + Number(item.quantity)
														).toString(),
														version: variant.version + 1,
													})
													.where(
														and(
															eq(productVariants.id, item.variantId),
															eq(productVariants.version, variant.version),
														),
													);

												if (updateResult.rowCount === 0) {
													throw new Error(
														`Concurrent modification on variant ${item.variantId}`,
													);
												}

												movementRows.push({
													businessId: tenantId,
													variantId: item.variantId,
													type: "in",
													quantity: item.quantity.toString(),
													referenceType: "order_void",
													referenceId: orderId,
													notes: `Order ${orderId} voided: ${reason}`,
													createdBy: voidedBy,
													createdAt: voidedAtIso,
												});
											}
										} else {
											await tx
												.update(products)
												.set({
													stock: sql`${products.stock} + ${item.quantity}`,
													version: sql`${products.version} + 1`,
												})
												.where(eq(products.id, item.productId));

											movementRows.push({
												businessId: tenantId,
												variantId: null,
												type: "in",
												quantity: item.quantity.toString(),
												referenceType: "order_void",
												referenceId: orderId,
												notes: `Order ${orderId} voided: ${reason}`,
												createdBy: voidedBy,
												createdAt: voidedAtIso,
											});
										}
									}

									if (movementRows.length > 0) {
										await tx.insert(stockMovements).values(movementRows);
									}

									await tx.insert(auditLogs).values({
										id: generateId(),
										businessId: tenantId,
										userId: voidedBy,
										action: "void",
										entityType: "order",
										entityId: orderId,
										newValue: { reason },
										createdAt: voidedAtIso,
									});
								});

								resume(Effect.succeed(undefined));
							} catch (e) {
								if (e instanceof OrderNotFoundError) {
									resume(Effect.fail(e));
									return;
								}
								if (e instanceof OrderAlreadyVoidedError) {
									resume(Effect.fail(e));
									return;
								}
								resume(
									Effect.fail(
										e instanceof DatabaseError
											? e
											: new DatabaseError({ cause: e }),
									),
								);
							}
						})();
					}),
				),

			findDrafts: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const results = await db.query.orders.findMany({
								where: {
									RAW: (orders, { and, eq }) =>
										and(
											eq(orders.businessId, tenantId),
											eq(orders.status, "draft"),
										) ?? sql``,
								},
								orderBy: (orders, { desc }) => [desc(orders.createdAt)],
							});

							if (results.length === 0) return [];

							const orderIds = results.map((r) => r.id);
							const itemRows = await db
								.select()
								.from(orderItems)
								.where(inArray(orderItems.orderId, orderIds));

							const itemsByOrder = new Map<string, TOrderItemRow[]>();
							for (const item of itemRows) {
								const list = itemsByOrder.get(item.orderId) ?? [];
								list.push(item);
								itemsByOrder.set(item.orderId, list);
							}

							return results.map((d) =>
								mapOrderRow(
									d,
									(itemsByOrder.get(d.id) ?? []).map(mapOrderItemRow),
								),
							);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getProductFrequency: (tenantId: TTenantId, startDate?: Date) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const sql = await import("drizzle-orm").then((m) => m.sql);
							const results = await db.execute<{
								product_id: string;
								quantity: string;
							}>(sql`
								SELECT * FROM public.get_product_frequency(
									${tenantId}::uuid,
									${startDate ? startDate.toISOString() : null}::timestamptz
								)
							`);

							const frequency: Record<string, number> = {};
							results.rows.forEach((row) => {
								frequency[row.product_id as string] = Number(row.quantity);
							});

							return frequency as Readonly<Record<string, number>>;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
