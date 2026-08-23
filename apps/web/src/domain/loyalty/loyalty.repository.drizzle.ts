import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	customerLoyalty,
	loyaltyConfig,
	loyaltyTiers,
	loyaltyTransactions,
	promoCodes,
	promoUsage,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import {
	type AtomicEarnPointsParams,
	type AtomicRedeemPointsParams,
	ILoyaltyRepository,
} from "./loyalty.repository";
import type {
	TCustomerLoyalty,
	TCustomerLoyaltyId,
	TLoyaltyConfig,
	TLoyaltyTier,
	TLoyaltyTierId,
	TPointsTransaction,
	TPointsTransactionId,
	TPromoCode,
	TPromoCodeId,
	TPromoCodeType,
	TPromoUsageRecord,
} from "./loyalty.types";

type TLoyaltyConfigRow = typeof loyaltyConfig.$inferSelect;
type TLoyaltyTierRow = typeof loyaltyTiers.$inferSelect;
type TCustomerLoyaltyRow = typeof customerLoyalty.$inferSelect;
type TLoyaltyTransactionRow = typeof loyaltyTransactions.$inferSelect;

const mapConfigRow = (row: TLoyaltyConfigRow): TLoyaltyConfig => ({
	businessId: row.businessId as TTenantId,
	pointsPerRupiah: Number(row.pointsPerRupiah),
	pointsExpiryDays: row.pointsExpiryDays ?? 0,
	minRedeemPoints: row.minRedeemPoints ?? 0,
	isActive: row.isActive ?? false,
});

const mapTierRow = (row: TLoyaltyTierRow): TLoyaltyTier => ({
	id: row.id as TLoyaltyTierId,
	tenantId: row.businessId as TTenantId,
	name: row.name,
	minPoints: row.minPoints,
	discountPercent: Number(row.discountPercent),
	benefits: (row.benefits as readonly string[]) ?? [],
});

const mapCustomerRow = (row: TCustomerLoyaltyRow): TCustomerLoyalty => ({
	id: row.id as TCustomerLoyaltyId,
	tenantId: row.businessId as TTenantId,
	customerName: row.customerName ?? "",
	customerPhone: row.customerPhone,
	totalPoints: row.totalPoints ?? 0,
	currentTierId: (row.currentTierId as TLoyaltyTierId | null) ?? null,
});

const mapPromoCodeRow = (row: typeof promoCodes.$inferSelect): TPromoCode => ({
	id: row.id as TPromoCodeId,
	tenantId: row.businessId as TTenantId,
	code: row.code,
	name: row.name,
	description: row.description ?? "",
	type: row.type as TPromoCodeType,
	value: Number(row.value),
	minOrderAmount: Number(row.minOrderAmount ?? 0),
	maxDiscountAmount:
		row.maxDiscountAmount !== null ? Number(row.maxDiscountAmount) : null,
	maxUses: row.maxUses,
	usedCount: row.usedCount ?? 0,
	maxUsesPerCustomer: row.maxUsesPerCustomer ?? 1,
	validFrom: row.validFrom,
	validUntil: row.validUntil,
	isActive: row.isActive ?? false,
	applicableServices: (row.applicableServices as readonly string[]) ?? [],
});

const mapPromoUsageRow = (
	row: typeof promoUsage.$inferSelect,
): TPromoUsageRecord => ({
	id: row.id,
	tenantId: row.businessId as TTenantId,
	promoCodeId: row.promoCodeId as TPromoCodeId,
	customerLoyaltyId: row.customerLoyaltyId,
	orderId: row.orderId,
	discountAmount: Number(row.discountAmount),
	usedAt: row.usedAt ?? "",
});

const mapTransactionRow = (
	row: TLoyaltyTransactionRow,
): TPointsTransaction => ({
	id: row.id as TPointsTransactionId,
	tenantId: row.businessId as TTenantId,
	customerLoyaltyId: row.customerLoyaltyId as TCustomerLoyaltyId,
	type: row.type as "earn" | "redeem" | "expire" | "adjust",
	points: row.points,
	description: row.description ?? "",
	orderId: row.orderId,
	createdAt: new Date(row.createdAt ?? new Date().toISOString()),
});

export const LoyaltyRepositoryDrizzle = Layer.effect(
	ILoyaltyRepository,
	Effect.map(IDrizzleClient, (db) =>
		ILoyaltyRepository.of({
			getConfig: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(loyaltyConfig)
								.where(eq(loyaltyConfig.businessId, tenantId))
								.limit(1);
							const row = rows[0];
							if (!row) return null;
							return mapConfigRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getTiers: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(loyaltyTiers)
								.where(eq(loyaltyTiers.businessId, tenantId))
								.orderBy(asc(loyaltyTiers.minPoints));
							return rows.map(mapTierRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findCustomerByPhone: (tenantId: TTenantId, phone: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(customerLoyalty)
								.where(
									and(
										eq(customerLoyalty.businessId, tenantId),
										eq(customerLoyalty.customerPhone, phone),
									),
								)
								.limit(1);
							const row = rows[0];
							if (!row) return null;
							return mapCustomerRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findCustomerById: (tenantId: TTenantId, customerId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(customerLoyalty)
								.where(
									and(
										eq(customerLoyalty.businessId, tenantId),
										eq(customerLoyalty.customerId, customerId),
									),
								)
								.limit(1);
							const row = rows[0];
							if (!row) return null;
							return mapCustomerRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			updateConfig: (config: TLoyaltyConfig) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.insert(loyaltyConfig)
								.values({
									businessId: config.businessId,
									pointsPerRupiah: String(config.pointsPerRupiah),
									pointsExpiryDays: config.pointsExpiryDays,
									minRedeemPoints: config.minRedeemPoints,
									isActive: config.isActive,
								})
								.onConflictDoUpdate({
									target: loyaltyConfig.businessId,
									set: {
										pointsPerRupiah: String(config.pointsPerRupiah),
										pointsExpiryDays: config.pointsExpiryDays,
										minRedeemPoints: config.minRedeemPoints,
										isActive: config.isActive,
										updatedAt: new Date().toISOString(),
									},
								});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			updateCustomerPoints: (
				tenantId: TTenantId,
				customerLoyaltyId: string,
				totalPoints: number,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(customerLoyalty)
								.set({
									totalPoints,
									availablePoints: totalPoints,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(customerLoyalty.id, customerLoyaltyId),
										eq(customerLoyalty.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			savePointsTransaction: (transaction: TPointsTransaction) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(loyaltyTransactions).values({
								id: transaction.id,
								businessId: transaction.tenantId,
								customerLoyaltyId: transaction.customerLoyaltyId,
								type: transaction.type,
								points: transaction.points,
								description: transaction.description,
								orderId: transaction.orderId,
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			getPointsTransactions: (tenantId: TTenantId, customerLoyaltyId: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(loyaltyTransactions)
								.where(
									and(
										eq(
											loyaltyTransactions.customerLoyaltyId,
											customerLoyaltyId,
										),
										eq(loyaltyTransactions.businessId, tenantId),
									),
								)
								.orderBy(desc(loyaltyTransactions.createdAt));
							return rows.map(mapTransactionRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			getAllPointsTransactions: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select({
									transaction: loyaltyTransactions,
									customerId: customerLoyalty.customerId,
									customerName: customerLoyalty.customerName,
								})
								.from(loyaltyTransactions)
								.innerJoin(
									customerLoyalty,
									eq(
										customerLoyalty.id,
										loyaltyTransactions.customerLoyaltyId,
									),
								)
								.where(eq(loyaltyTransactions.businessId, tenantId))
								.orderBy(desc(loyaltyTransactions.createdAt));
							return rows.map((row) => ({
								transaction: mapTransactionRow(row.transaction),
								customerId: row.customerId,
								customerName: row.customerName ?? "",
							}));
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			atomicEarnPoints: (params: AtomicEarnPointsParams) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const newTotal = await db.transaction(async (tx) => {
								const lockedRows = await tx
									.select({
										id: customerLoyalty.id,
										businessId: customerLoyalty.businessId,
										totalPoints: customerLoyalty.totalPoints,
										availablePoints: customerLoyalty.availablePoints,
									})
									.from(customerLoyalty)
									.where(eq(customerLoyalty.id, params.customerLoyaltyId))
									.for("update")
									.limit(1);
								const locked = lockedRows[0];
								if (!locked) {
									throw new Error(
										`Customer loyalty ${params.customerLoyaltyId} not found`,
									);
								}
								if (locked.businessId !== params.tenantId) {
									throw new Error(
										`Customer loyalty ${params.customerLoyaltyId} does not belong to business ${params.tenantId}`,
									);
								}

								await tx.insert(loyaltyTransactions).values({
									id: params.transactionId,
									businessId: params.tenantId,
									customerLoyaltyId: params.customerLoyaltyId,
									orderId: params.orderId ?? null,
									type: "earn",
									points: params.points,
									description: params.description ?? null,
								});

								const updatedRows = await tx
									.update(customerLoyalty)
									.set({
										totalPoints: sql`${customerLoyalty.totalPoints} + ${params.points}`,
										availablePoints: sql`${customerLoyalty.availablePoints} + ${params.points}`,
										updatedAt: new Date().toISOString(),
									})
									.where(eq(customerLoyalty.id, params.customerLoyaltyId))
									.returning({ totalPoints: customerLoyalty.totalPoints });

								const updated = updatedRows[0];
								if (!updated) {
									throw new Error(
										`Failed to update customer loyalty ${params.customerLoyaltyId}`,
									);
								}
								return updated.totalPoints ?? 0;
							});
							return newTotal;
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			atomicRedeemPoints: (params: AtomicRedeemPointsParams) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const newTotal = await db.transaction(async (tx) => {
								const lockedRows = await tx
									.select({
										id: customerLoyalty.id,
										businessId: customerLoyalty.businessId,
										totalPoints: customerLoyalty.totalPoints,
										availablePoints: customerLoyalty.availablePoints,
									})
									.from(customerLoyalty)
									.where(eq(customerLoyalty.id, params.customerLoyaltyId))
									.for("update")
									.limit(1);
								const locked = lockedRows[0];
								if (!locked) {
									throw new Error(
										`Customer loyalty ${params.customerLoyaltyId} not found`,
									);
								}
								if (locked.businessId !== params.tenantId) {
									throw new Error(
										`Customer loyalty ${params.customerLoyaltyId} does not belong to business ${params.tenantId}`,
									);
								}

								const currentAvailable =
									locked.availablePoints ?? locked.totalPoints ?? 0;
								if (currentAvailable < params.points) {
									throw new Error(
										`Insufficient points: have ${currentAvailable}, need ${params.points}`,
									);
								}

								await tx.insert(loyaltyTransactions).values({
									id: params.transactionId,
									businessId: params.tenantId,
									customerLoyaltyId: params.customerLoyaltyId,
									orderId: params.orderId ?? null,
									type: "redeem",
									points: -params.points,
									description: params.description ?? "Points redeemed",
								});

								const updatedRows = await tx
									.update(customerLoyalty)
									.set({
										totalPoints: sql`${customerLoyalty.totalPoints} - ${params.points}`,
										availablePoints: sql`${customerLoyalty.availablePoints} - ${params.points}`,
										updatedAt: new Date().toISOString(),
									})
									.where(eq(customerLoyalty.id, params.customerLoyaltyId))
									.returning({ totalPoints: customerLoyalty.totalPoints });

								const updated = updatedRows[0];
								if (!updated) {
									throw new Error(
										`Failed to update customer loyalty ${params.customerLoyaltyId}`,
									);
								}
								return updated.totalPoints ?? 0;
							});
							return newTotal;
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),
			getPromoCodes: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(promoCodes)
								.where(eq(promoCodes.businessId, tenantId))
								.orderBy(desc(promoCodes.createdAt));
							return rows.map(mapPromoCodeRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			getActivePromoCodes: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const now = new Date().toISOString();
							const rows = await db
								.select()
								.from(promoCodes)
								.where(
									and(
										eq(promoCodes.businessId, tenantId),
										eq(promoCodes.isActive, true),
										sql`${promoCodes.validFrom} <= ${now}`,
										sql`${promoCodes.validUntil} >= ${now}`,
									),
								)
								.orderBy(desc(promoCodes.createdAt));
							return rows.map(mapPromoCodeRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			findPromoCodeByCode: (tenantId: TTenantId, code: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(promoCodes)
								.where(
									and(
										eq(promoCodes.businessId, tenantId),
										sql`LOWER(${promoCodes.code}) = LOWER(${code})`,
									),
								)
								.limit(1);
							const row = rows[0];
							if (!row) return null;
							return mapPromoCodeRow(row);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			createPromoCode: (promoCode: TPromoCode) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(promoCodes).values({
								id: promoCode.id,
								businessId: promoCode.tenantId,
								code: promoCode.code,
								name: promoCode.name,
								description: promoCode.description,
								type: promoCode.type,
								value: String(promoCode.value),
								minOrderAmount: String(promoCode.minOrderAmount),
								maxDiscountAmount:
									promoCode.maxDiscountAmount !== null
										? String(promoCode.maxDiscountAmount)
										: null,
								maxUses: promoCode.maxUses,
								maxUsesPerCustomer: promoCode.maxUsesPerCustomer,
								validFrom: promoCode.validFrom,
								validUntil: promoCode.validUntil,
								isActive: promoCode.isActive,
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),
			updatePromoCode: (promoCode: TPromoCode) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(promoCodes)
								.set({
									name: promoCode.name,
									description: promoCode.description,
									type: promoCode.type,
									value: String(promoCode.value),
									minOrderAmount: String(promoCode.minOrderAmount),
									maxDiscountAmount:
										promoCode.maxDiscountAmount !== null
											? String(promoCode.maxDiscountAmount)
											: null,
									maxUses: promoCode.maxUses,
									maxUsesPerCustomer: promoCode.maxUsesPerCustomer,
									validFrom: promoCode.validFrom,
									validUntil: promoCode.validUntil,
									isActive: promoCode.isActive,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(promoCodes.id, promoCode.id),
										eq(promoCodes.businessId, promoCode.tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),
			incrementPromoUsage: (tenantId: TTenantId, promoCodeId: TPromoCodeId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db
								.update(promoCodes)
								.set({
									usedCount: sql`${promoCodes.usedCount} + 1`,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(promoCodes.id, promoCodeId),
										eq(promoCodes.businessId, tenantId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),
			getCustomerPromoUsage: (
				tenantId: TTenantId,
				promoCodeId: TPromoCodeId,
				customerLoyaltyId: string,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select()
								.from(promoUsage)
								.where(
									and(
										eq(promoUsage.businessId, tenantId),
										eq(promoUsage.promoCodeId, promoCodeId),
										eq(promoUsage.customerLoyaltyId, customerLoyaltyId),
									),
								);
							return rows.map(mapPromoUsageRow);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			savePromoUsage: (record: TPromoUsageRecord) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.insert(promoUsage).values({
								id: record.id,
								businessId: record.tenantId,
								promoCodeId: record.promoCodeId,
								customerLoyaltyId: record.customerLoyaltyId,
								orderId: record.orderId,
								discountAmount: String(record.discountAmount),
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),
		}),
	),
);
