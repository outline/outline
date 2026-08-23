import { desc, eq, inArray, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import { orderItems, orders, products } from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { DashboardRepository } from "./dashboard.repository";

const TOP_SELLERS_LIMIT = 100;
const INVENTORY_DASHBOARD_LIMIT = 4;

export const DashboardRepositoryDrizzle = Layer.effect(
	DashboardRepository,
	Effect.map(IDrizzleClient, (db) =>
		DashboardRepository.of({
			getTopSellerItems: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const recentOrders = await db
								.select({ id: orders.id })
								.from(orders)
								.where(eq(orders.businessId, tenantId))
								.orderBy(desc(orders.createdAt))
								.limit(TOP_SELLERS_LIMIT);

							if (recentOrders.length === 0) return [];

							const orderIds = recentOrders.map((o) => o.id);
							const rows = await db
								.select({
									productId: orderItems.productId,
									quantity: orderItems.quantity,
									priceAtTime: orderItems.priceAtTime,
									name: products.name,
									category: products.category,
								})
								.from(orderItems)
								.innerJoin(orders, eq(orderItems.orderId, orders.id))
								.innerJoin(products, eq(orderItems.productId, products.id))
								.where(inArray(orderItems.orderId, orderIds));

							return rows.map((row) => ({
								productId: row.productId,
								name: row.name,
								category: row.category ?? "",
								quantity: Number(row.quantity),
								revenue: Number(row.priceAtTime) * Number(row.quantity),
							}));
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getInventoryProducts: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select({
									name: products.name,
									stock: products.stock,
									updatedAt: products.updatedAt,
								})
								.from(products)
								.where(eq(products.businessId, tenantId))
								.orderBy(desc(products.updatedAt))
								.limit(INVENTORY_DASHBOARD_LIMIT);

							const totalCountRows = await db
								.select({ count: sql<number>`COUNT(*)::int` })
								.from(products)
								.where(eq(products.businessId, tenantId));

							return {
								products: rows.map((p) => ({
									name: p.name,
									stock: p.stock ?? 0,
									updatedAt: p.updatedAt,
								})),
								totalCount: Number(totalCountRows[0]?.count ?? 0),
							};
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
