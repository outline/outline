import {
	and,
	eq,
	inArray,
	lte,
	notInArray,
	or,
	sql,
	type SQL,
} from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	orderItems,
	orders,
	products,
	productVariants,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { DuplicateSkuError, ProductNotFoundError } from "./product.errors";
import { IProductRepository } from "./product.repository";
import type {
	TProduct,
	TProductId,
	TProductUnit,
	TProductVariant,
	TProductVariantId,
	TProductWithVariants,
} from "./product.types";

type TProductRow = typeof products.$inferSelect;
type TProductVariantRow = typeof productVariants.$inferSelect;

const MAX_SEARCH_SCAN = 1000;

const mapProduct = (d: TProductRow): TProduct => ({
	id: d.id as TProductId,
	tenantId: d.businessId as TTenantId,
	name: d.name,
	category: d.category ?? null,
	description: d.description ?? null,
	brand: d.brand ?? null,
	imageUrl: d.imageUrl ?? null,
	hasVariants: d.hasVariants,
	isActive: d.isActive,
	isFeatured: d.isFeatured,
	createdAt: new Date(d.createdAt),
	updatedAt: new Date(d.updatedAt),
});

const mapVariant = (d: TProductVariantRow): TProductVariant => ({
	id: d.id as TProductVariantId,
	productId: d.productId as TProductId,
	tenantId: d.businessId as TTenantId,
	name: d.name,
	sku: d.sku ?? null,
	barcode: d.barcode ?? null,
	price: Number(d.price),
	costPrice: Number(d.costPrice ?? 0),
	unit: (d.unit ?? "pcs") as TProductUnit,
	isFractional: d.isFractional,
	stock: Number(d.stock),
	lowStockThreshold: Number(d.lowStockThreshold ?? 5),
	isActive: d.isActive,
	sortOrder: Number(d.sortOrder ?? 0),
	createdAt: new Date(d.createdAt),
	updatedAt: new Date(d.updatedAt),
});

const nowISO = (): string => new Date().toISOString();

export const ProductRepositoryDrizzle = Layer.effect(
	IProductRepository,
	Effect.map(IDrizzleClient, (db) =>
		IProductRepository.of({
			// ─── Product: findById ─────────────────────────────────────────────
			findById: (id: TProductId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const [row] = await db
							.select()
							.from(products)
							.where(
								and(eq(products.id, id), eq(products.businessId, tenantId)),
							)
							.limit(1);
						if (!row) return null;
						return mapProduct(row);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Product: findAllActive ────────────────────────────────────────
			findAllActive: (tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select()
							.from(products)
							.where(
								and(
									eq(products.businessId, tenantId),
									eq(products.isActive, true),
								),
							)
							.orderBy(sql`${products.createdAt} DESC`);

						if (rows.length === 0) return [];

						const productIds = rows.map((r) => r.id);
						const variantRows = await db
							.select()
							.from(productVariants)
							.where(
								and(
									inArray(productVariants.productId, productIds),
									eq(productVariants.isActive, true),
								),
							);

						const variantsByProductId = new Map<string, TProductVariantRow[]>();
						for (const v of variantRows) {
							const list = variantsByProductId.get(v.productId) ?? [];
							list.push(v);
							variantsByProductId.set(v.productId, list);
						}

						return rows.map((p) => {
							const product = mapProduct(p);
							const variants = (variantsByProductId.get(p.id) ?? [])
								.map(mapVariant)
								.sort((a, b) => a.sortOrder - b.sortOrder);
							return { ...product, variants } as TProductWithVariants;
						});
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findFeatured: (tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select()
							.from(products)
							.where(
								and(
									eq(products.businessId, tenantId),
									eq(products.isActive, true),
									eq(products.isFeatured, true),
								),
							)
							.orderBy(sql`${products.createdAt} DESC`);

						if (rows.length === 0) return [];

						const productIds = rows.map((r) => r.id);
						const variantRows = await db
							.select()
							.from(productVariants)
							.where(
								and(
									inArray(productVariants.productId, productIds),
									eq(productVariants.isActive, true),
								),
							);

						const variantsByProductId = new Map<string, TProductVariantRow[]>();
						for (const v of variantRows) {
							const list = variantsByProductId.get(v.productId) ?? [];
							list.push(v);
							variantsByProductId.set(v.productId, list);
						}

						return rows.map((p) => {
							const product = mapProduct(p);
							const variants = (variantsByProductId.get(p.id) ?? [])
								.map(mapVariant)
								.sort((a, b) => a.sortOrder - b.sortOrder);
							return { ...product, variants } as TProductWithVariants;
						});
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findLowStock: (
				tenantId: TTenantId,
				options?: { limit?: number; offset?: number },
			) =>
				Effect.tryPromise({
					try: async () => {
						const whereClause = and(
							eq(productVariants.businessId, tenantId),
							eq(productVariants.isActive, true),
							lte(productVariants.stock, productVariants.lowStockThreshold),
						);

						const [rows, totalRows] = await Promise.all([
							db
								.select()
								.from(productVariants)
								.where(whereClause)
								.orderBy(sql`${productVariants.stock} ASC`)
								.limit(options?.limit ?? 50)
								.offset(options?.offset ?? 0),
							db
								.select({ count: sql<number>`count(*)::int` })
								.from(productVariants)
								.where(whereClause),
						]);

						return {
							items: rows.map(mapVariant),
							total: totalRows[0]?.count ?? 0,
						};
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Product: findPage (search + category + price + sort + pagination) ──
			findPage: (
				tenantId: TTenantId,
				options?: {
					readonly search?: string;
					readonly category?: string;
					readonly minPrice?: number;
					readonly maxPrice?: number;
					readonly sort?: "newest" | "popular";
					readonly limit?: number;
					readonly offset?: number;
				},
			) =>
				Effect.tryPromise({
					try: async () => {
						const search = options?.search?.trim();
						const category = options?.category;
						const minPrice = options?.minPrice;
						const maxPrice = options?.maxPrice;
						const sort = options?.sort ?? "newest";
						const limit = options?.limit ?? 100;
						const offset = options?.offset ?? 0;

						let skuMatchProductIds: string[] = [];
						if (search) {
							const skuRows = await db
								.selectDistinct({ productId: productVariants.productId })
								.from(productVariants)
								.where(
									and(
										eq(productVariants.businessId, tenantId),
										sql`${productVariants.sku} ILIKE ${`%${search}%`}`,
									),
								);
							skuMatchProductIds = skuRows.map((r) => r.productId);
						}

						const conditions: SQL[] = [
							eq(products.businessId, tenantId),
							eq(products.isActive, true),
						];
						if (category) {
							conditions.push(sql`${products.category} ILIKE ${category}`);
						}
						if (search) {
							conditions.push(
								skuMatchProductIds.length > 0
									? (or(
											sql`${products.name} ILIKE ${`%${search}%`}`,
											inArray(products.id, skuMatchProductIds),
										) as SQL)
									: sql`${products.name} ILIKE ${`%${search}%`}`,
							);
						}

						// Bounds the worst case as the catalog grows - `limit`/`offset`
						// (and the price-range/popularity filters below) are applied
						// in-memory after this fetch, so an unbounded catalog match
						// would otherwise load every row on every search. 1000 is far
						// above any current or near-term real result size.
						const matchingRows = await db
							.select()
							.from(products)
							.where(and(...conditions))
							.orderBy(sql`${products.createdAt} DESC`)
							.limit(MAX_SEARCH_SCAN);

						if (matchingRows.length === 0) {
							return { items: [], total: 0 };
						}

						const productIds = matchingRows.map((r) => r.id);
						const variantRows = await db
							.select()
							.from(productVariants)
							.where(
								and(
									inArray(productVariants.productId, productIds),
									eq(productVariants.isActive, true),
								),
							);

						const variantsByProductId = new Map<string, TProductVariantRow[]>();
						for (const v of variantRows) {
							const list = variantsByProductId.get(v.productId) ?? [];
							list.push(v);
							variantsByProductId.set(v.productId, list);
						}

						let withVariants: TProductWithVariants[] = matchingRows.map((p) => {
							const product = mapProduct(p);
							const variants = (variantsByProductId.get(p.id) ?? [])
								.map(mapVariant)
								.sort((a, b) => a.sortOrder - b.sortOrder);
							return { ...product, variants } as TProductWithVariants;
						});

						// Price range: keep products with at least one active variant
						// whose price falls in [minPrice, maxPrice] (each bound optional).
						if (minPrice !== undefined || maxPrice !== undefined) {
							withVariants = withVariants.filter((p) =>
								p.variants.some(
									(v) =>
										(minPrice === undefined || v.price >= minPrice) &&
										(maxPrice === undefined || v.price <= maxPrice),
								),
							);
						}

						if (sort === "popular") {
							// Was: fetch every order + every order_item for the whole
							// tenant, then hand-aggregate in JS. Replaced with a single
							// SQL GROUP BY scoped to only the products already matched
							// by this search (`productIds`), not the tenant's entire
							// order history.
							const soldCounts = await db
								.select({
									productId: orderItems.productId,
									total: sql<string>`SUM(${orderItems.quantity})`,
								})
								.from(orderItems)
								.innerJoin(orders, eq(orderItems.orderId, orders.id))
								.where(
									and(
										eq(orders.businessId, tenantId),
										inArray(orderItems.productId, productIds),
									),
								)
								.groupBy(orderItems.productId);

							const soldCountByProductId = new Map(
								soldCounts.map((r) => [r.productId, Number(r.total)]),
							);

							withVariants = [...withVariants].sort(
								(a, b) =>
									(soldCountByProductId.get(b.id) ?? 0) -
									(soldCountByProductId.get(a.id) ?? 0),
							);
						}

						const total = withVariants.length;
						const page = withVariants.slice(offset, offset + limit);

						return { items: page, total };
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Product: delete ───────────────────────────────────────────────
			delete: (id: TProductId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.delete(products)
							.where(
								and(eq(products.id, id), eq(products.businessId, tenantId)),
							);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Product: save (single product row) ────────────────────────────
			save: (product: TProduct) =>
				Effect.tryPromise({
					try: async () => {
						await db.insert(products).values({
							id: product.id,
							businessId: product.tenantId,
							name: product.name,
							category: product.category,
							description: product.description,
							brand: product.brand,
							imageUrl: product.imageUrl,
							hasVariants: product.hasVariants,
							isActive: product.isActive,
						});
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Product: update (single product row) ──────────────────────────
			update: (product: TProduct) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.update(products)
							.set({
								name: product.name,
								category: product.category,
								description: product.description,
								brand: product.brand,
								imageUrl: product.imageUrl,
								hasVariants: product.hasVariants,
								isActive: product.isActive,
								updatedAt: nowISO(),
							})
							.where(
								and(
									eq(products.id, product.id),
									eq(products.businessId, product.tenantId),
								),
							);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Product: saveFull (product + variants, atomic RPC port) ──────
			saveFull: (
				productWithVariants: TProductWithVariants,
				options: { readonly isNew: boolean },
			) =>
				Effect.tryPromise({
					try: async () => {
						await db.transaction(async (tx) => {
							if (options.isNew) {
								await tx.insert(products).values({
									id: productWithVariants.id,
									businessId: productWithVariants.tenantId,
									name: productWithVariants.name,
									category: productWithVariants.category,
									description: productWithVariants.description,
									brand: productWithVariants.brand,
									imageUrl: productWithVariants.imageUrl,
									hasVariants: productWithVariants.hasVariants,
									isActive: productWithVariants.isActive,
								});
							} else {
								const result = await tx
									.update(products)
									.set({
										name: productWithVariants.name,
										category: productWithVariants.category,
										description: productWithVariants.description,
										brand: productWithVariants.brand,
										imageUrl: productWithVariants.imageUrl,
										hasVariants: productWithVariants.hasVariants,
										isActive: productWithVariants.isActive,
										updatedAt: nowISO(),
									})
									.where(
										and(
											eq(products.id, productWithVariants.id),
											eq(products.businessId, productWithVariants.tenantId),
										),
									);
								if (result.rowCount === 0) {
									throw new ProductNotFoundError({
										id: productWithVariants.id,
									});
								}

								// Soft-delete variants removed on replace
								const incomingVariantIds = productWithVariants.variants.map(
									(v) => v.id,
								);
								if (incomingVariantIds.length > 0) {
									await tx
										.update(productVariants)
										.set({ isActive: false, updatedAt: nowISO() })
										.where(
											and(
												eq(productVariants.productId, productWithVariants.id),
												eq(
													productVariants.businessId,
													productWithVariants.tenantId,
												),
												eq(productVariants.isActive, true),
												notInArray(productVariants.id, incomingVariantIds),
											),
										);
								} else {
									await tx
										.update(productVariants)
										.set({ isActive: false, updatedAt: nowISO() })
										.where(
											and(
												eq(productVariants.productId, productWithVariants.id),
												eq(
													productVariants.businessId,
													productWithVariants.tenantId,
												),
												eq(productVariants.isActive, true),
											),
										);
								}
							}

							// Upsert each variant
							if (productWithVariants.variants.length > 0) {
								for (const v of productWithVariants.variants) {
									await tx
										.insert(productVariants)
										.values({
											id: v.id,
											productId: v.productId,
											businessId: v.tenantId,
											name: v.name,
											sku: v.sku,
											barcode: v.barcode,
											price: String(v.price),
											costPrice: String(v.costPrice),
											unit: v.unit,
											isFractional: v.isFractional,
											stock: String(v.stock),
											lowStockThreshold: String(v.lowStockThreshold),
											isActive: v.isActive,
											sortOrder: v.sortOrder,
										})
										.onConflictDoUpdate({
											target: productVariants.id,
											set: {
												name: v.name,
												sku: v.sku,
												barcode: v.barcode,
												price: String(v.price),
												costPrice: String(v.costPrice),
												unit: v.unit,
												isFractional: v.isFractional,
												stock: String(v.stock),
												lowStockThreshold: String(v.lowStockThreshold),
												isActive: v.isActive,
												sortOrder: v.sortOrder,
												updatedAt: nowISO(),
											},
										});
								}
							}
						});
					},
					catch: (e) =>
						e instanceof ProductNotFoundError
							? e
							: new DatabaseError({ cause: e }),
				}),

			// ─── Variant: findVariantsByProductId ──────────────────────────────
			findVariantsByProductId: (productId: TProductId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select()
							.from(productVariants)
							.where(
								and(
									eq(productVariants.productId, productId),
									eq(productVariants.businessId, tenantId),
									eq(productVariants.isActive, true),
								),
							)
							.orderBy(productVariants.sortOrder);
						return rows.map(mapVariant);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Variant: findVariantById ──────────────────────────────────────
			findVariantById: (id: TProductVariantId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const [row] = await db
							.select()
							.from(productVariants)
							.where(
								and(
									eq(productVariants.id, id),
									eq(productVariants.businessId, tenantId),
								),
							)
							.limit(1);
						if (!row) return null;
						return mapVariant(row);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Variant: saveVariant ──────────────────────────────────────────
			saveVariant: (variant: TProductVariant) =>
				Effect.tryPromise({
					try: async () => {
						await db.insert(productVariants).values({
							id: variant.id,
							productId: variant.productId,
							businessId: variant.tenantId,
							name: variant.name,
							sku: variant.sku,
							barcode: variant.barcode,
							price: String(variant.price),
							costPrice: String(variant.costPrice),
							unit: variant.unit,
							isFractional: variant.isFractional,
							stock: String(variant.stock),
							lowStockThreshold: String(variant.lowStockThreshold),
							isActive: variant.isActive,
							sortOrder: variant.sortOrder,
						});
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Variant: updateVariant ────────────────────────────────────────
			updateVariant: (variant: TProductVariant) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.update(productVariants)
							.set({
								name: variant.name,
								sku: variant.sku,
								barcode: variant.barcode,
								price: String(variant.price),
								costPrice: String(variant.costPrice),
								unit: variant.unit,
								isFractional: variant.isFractional,
								stock: String(variant.stock),
								lowStockThreshold: String(variant.lowStockThreshold),
								isActive: variant.isActive,
								sortOrder: variant.sortOrder,
								updatedAt: nowISO(),
							})
							.where(
								and(
									eq(productVariants.id, variant.id),
									eq(productVariants.businessId, variant.tenantId),
								),
							);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Variant: deleteVariant ────────────────────────────────────────
			deleteVariant: (id: TProductVariantId, tenantId: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.delete(productVariants)
							.where(
								and(
									eq(productVariants.id, id),
									eq(productVariants.businessId, tenantId),
								),
							);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── existsBySku ──────────────────────────────────────────────────
			existsBySku: (
				sku: string,
				tenantId: TTenantId,
				excludeVariantId?: TProductVariantId,
			) =>
				Effect.tryPromise({
					try: async () => {
						const conditions: ReturnType<typeof eq>[] = [
							eq(productVariants.sku, sku),
							eq(productVariants.businessId, tenantId),
						];
						if (excludeVariantId) {
							conditions.push(
								sql`${productVariants.id} != ${excludeVariantId}`,
							);
						}
						const [row] = await db
							.select({ count: sql<number>`count(*)::int` })
							.from(productVariants)
							.where(and(...conditions));
						return (row?.count ?? 0) > 0;
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			// ─── Atomic import (port of atomic_import_product RPC) ────────────
			importProduct: (params, tenantId) =>
				Effect.tryPromise({
					try: async () => {
						return await db.transaction(async (tx) => {
							if (params.sku != null) {
								const [existing] = await tx
									.select({ id: productVariants.id })
									.from(productVariants)
									.where(
										and(
											eq(productVariants.sku, params.sku),
											eq(productVariants.businessId, tenantId),
										),
									)
									.for("update")
									.limit(1);
								if (existing) {
									throw new DuplicateSkuError({ sku: params.sku });
								}
							}

							await tx.insert(products).values({
								id: params.productId,
								businessId: tenantId,
								name: params.name,
								category: params.category,
								description: params.description,
								brand: params.brand,
								imageUrl: params.imageUrl,
								hasVariants: params.hasVariants,
								isActive: params.isActive,
							});

							await tx.insert(productVariants).values({
								id: params.variantId,
								productId: params.productId,
								businessId: tenantId,
								name: params.variantName,
								sku: params.sku,
								price: String(params.price),
								costPrice: String(params.costPrice),
								unit: params.unit,
								isFractional: params.isFractional,
								stock: String(params.stock),
								lowStockThreshold: String(params.lowStockThreshold),
								isActive: params.variantIsActive,
								sortOrder: params.sortOrder,
							});

							return {
								productId: params.productId,
								variantId: params.variantId,
							};
						});
					},
					catch: (e) =>
						e instanceof DuplicateSkuError
							? e
							: new DatabaseError({ cause: e as Error }),
				}),
		}),
	),
);
