import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import {
	type TProductDto,
	type TProductVariantDto,
	toProductDto,
	toProductVariantDto,
} from "./product.dto";
import {
	DuplicateSkuError,
	type NegativePriceError,
	type NegativeStockError,
	ProductNotFoundError,
} from "./product.errors";
import { ProductModule } from "./product.module";
import { IProductRepository } from "./product.repository";
import type {
	CreateProductCommand,
	CreateVariantCommand,
	UpdateProductCommand,
	UpdateVariantCommand,
} from "./product.schemas";
import type { TProductId, TProductVariantId } from "./product.types";

// ─── Product Programs ────────────────────────────────────────────────────────

export const getProductsProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TProductDto[], DatabaseError, IProductRepository> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const products = yield* repo.findAllActive(tenantId);
		return products.map((p) => toProductDto(p, p.variants));
	});

export const getProductProgram = (
	productId: string,
	tenantId: TTenantId,
): Effect.Effect<TProductDto | null, DatabaseError, IProductRepository> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const id = productId as TProductId;
		const product = yield* repo.findById(id, tenantId);
		if (!product) return null;
		const variants = yield* repo.findVariantsByProductId(id, tenantId);
		return toProductDto(product, variants);
	});

export const getLowStockProgram = (
	tenantId: TTenantId,
	options: { readonly limit?: number; readonly offset?: number },
): Effect.Effect<
	{
		readonly items: readonly {
			readonly variant: TProductVariantDto;
			readonly product: TProductDto | null;
		}[];
		readonly total: number;
	},
	DatabaseError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const { items, total } = yield* repo.findLowStock(tenantId, options);

		const productIds = Array.from(new Set(items.map((v) => v.productId)));
		const products =
			productIds.length > 0
				? yield* Effect.all(
						productIds.map((id) =>
							repo
								.findById(id, tenantId)
								.pipe(Effect.map((p) => ({ id, product: p }))),
						),
					)
				: [];
		const productMap = new Map(products.map((p) => [p.id, p.product]));

		return {
			items: items.map((variant) => {
				const product = productMap.get(variant.productId);
				return {
					variant: toProductVariantDto(variant),
					product: product ? toProductDto(product, [variant]) : null,
				};
			}),
			total,
		};
	});

export const getProductsPageProgram = (
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
): Effect.Effect<
	{ readonly items: readonly TProductDto[]; readonly total: number },
	DatabaseError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const { items, total } = yield* repo.findPage(tenantId, options);
		return {
			items: items.map((p) => toProductDto(p, p.variants)),
			total,
		};
	});

export const addProductProgram = (
	command: CreateProductCommand,
	tenantId: TTenantId,
): Effect.Effect<TProductDto, DatabaseError, IProductRepository> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;

		const product = yield* ProductModule.create({
			tenantId,
			name: command.name,
			category: command.category ?? null,
			description: command.description ?? null,
			brand: command.brand ?? null,
			imageUrl: command.imageUrl ?? null,
			hasVariants: command.hasVariants ?? false,
			isActive: command.isActive ?? true,
			isFeatured: false,
		});

		yield* repo.save(product);
		return toProductDto(product, []);
	});

export const updateProductProgram = (
	command: UpdateProductCommand,
	tenantId: TTenantId,
): Effect.Effect<
	TProductDto,
	DatabaseError | ProductNotFoundError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const productId = command.id as TProductId;

		const existing = yield* repo.findById(productId, tenantId);
		if (!existing) {
			yield* Effect.fail(new ProductNotFoundError({ id: productId }));
			return yield* Effect.fail(new ProductNotFoundError({ id: productId }));
		}

		const updated = yield* ProductModule.update(existing, {
			name: command.name,
			category: command.category ?? null,
			description: command.description ?? null,
			brand: command.brand ?? null,
			imageUrl: command.imageUrl ?? null,
			hasVariants: command.hasVariants ?? existing?.hasVariants,
			isActive: command.isActive ?? existing?.isActive,
		});

		yield* repo.update(updated);

		const variants = yield* repo.findVariantsByProductId(productId, tenantId);
		return toProductDto(updated, variants);
	});

export const deleteProductProgram = (
	id: string,
	tenantId: TTenantId,
	_userId: TUserId,
): Effect.Effect<
	void,
	DatabaseError | ProductNotFoundError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const productId = id as TProductId;

		const existing = yield* repo.findById(productId, tenantId);
		if (!existing) {
			yield* Effect.fail(new ProductNotFoundError({ id: productId }));
		}

		yield* repo.delete(productId, tenantId);
	});

export const getFeaturedProductsProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TProductDto[], DatabaseError, IProductRepository> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const products = yield* repo.findFeatured(tenantId);
		return products.map((p) => toProductDto(p, p.variants));
	});

export const toggleFeaturedProductProgram = (
	productId: string,
	tenantId: TTenantId,
): Effect.Effect<
	TProductDto,
	DatabaseError | ProductNotFoundError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const id = productId as TProductId;

		const existing = yield* repo.findById(id, tenantId);
		if (!existing) {
			yield* Effect.fail(new ProductNotFoundError({ id }));
			return yield* Effect.fail(new ProductNotFoundError({ id }));
		}

		const updated = yield* ProductModule.update(existing, {
			isFeatured: !existing.isFeatured,
		});

		yield* repo.update(updated);
		const variants = yield* repo.findVariantsByProductId(id, tenantId);
		return toProductDto(updated, variants);
	});

// ─── Variant Programs ────────────────────────────────────────────────────────

export const addVariantProgram = (
	command: CreateVariantCommand,
	tenantId: TTenantId,
): Effect.Effect<
	TProductVariantDto,
	| DatabaseError
	| DuplicateSkuError
	| ProductNotFoundError
	| NegativeStockError
	| NegativePriceError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const productId = command.productId as TProductId;

		const product = yield* repo.findById(productId, tenantId);
		if (!product) {
			yield* Effect.fail(new ProductNotFoundError({ id: productId }));
		}

		if (command.sku) {
			const exists = yield* repo.existsBySku(command.sku, tenantId);
			if (exists)
				yield* Effect.fail(new DuplicateSkuError({ sku: command.sku }));
		}

		const variant = yield* ProductModule.createVariant({
			productId,
			tenantId,
			name: command.name,
			sku: command.sku ?? null,
			barcode: command.barcode ?? null,
			price: command.price,
			costPrice: command.costPrice ?? 0,
			unit: command.unit ?? "pcs",
			isFractional: command.isFractional ?? false,
			stock: command.stock,
			lowStockThreshold: command.lowStockThreshold ?? 5,
			isActive: command.isActive ?? true,
			sortOrder: command.sortOrder ?? 0,
		});

		yield* repo.saveVariant(variant);
		return toProductVariantDto(variant);
	});

export const updateVariantProgram = (
	command: UpdateVariantCommand,
	tenantId: TTenantId,
): Effect.Effect<
	TProductVariantDto,
	| DatabaseError
	| DuplicateSkuError
	| ProductNotFoundError
	| NegativeStockError
	| NegativePriceError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const variantId = command.id as TProductVariantId;

		const existing = yield* repo.findVariantById(variantId, tenantId);
		if (!existing) {
			yield* Effect.fail(new ProductNotFoundError({ id: variantId }));
			return yield* Effect.fail(new ProductNotFoundError({ id: variantId }));
		}

		if (command.sku && command.sku !== existing?.sku) {
			const skuExists = yield* repo.existsBySku(
				command.sku,
				tenantId,
				variantId,
			);
			if (skuExists)
				yield* Effect.fail(new DuplicateSkuError({ sku: command.sku }));
		}

		const updated = yield* ProductModule.updateVariant(existing, {
			name: command.name,
			sku: command.sku ?? null,
			barcode: command.barcode ?? null,
			price: command.price,
			costPrice: command.costPrice ?? existing?.costPrice,
			unit: command.unit ?? existing?.unit,
			isFractional: command.isFractional ?? existing?.isFractional,
			stock: command.stock,
			lowStockThreshold:
				command.lowStockThreshold ?? existing?.lowStockThreshold,
			isActive: command.isActive ?? existing?.isActive,
			sortOrder: command.sortOrder ?? existing?.sortOrder,
		});

		yield* repo.updateVariant(updated);
		return toProductVariantDto(updated);
	});

export const deleteVariantProgram = (
	id: string,
	tenantId: TTenantId,
): Effect.Effect<
	void,
	DatabaseError | ProductNotFoundError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		const variantId = id as TProductVariantId;

		const existing = yield* repo.findVariantById(variantId, tenantId);
		if (!existing) {
			yield* Effect.fail(new ProductNotFoundError({ id: variantId }));
		}

		yield* repo.deleteVariant(variantId, tenantId);
	});

// ─── Legacy compat (used by POS) ─────────────────────────────────────────────
export const importProductsProgram = (
	products: readonly CreateVariantCommand[],
	tenantId: TTenantId,
): Effect.Effect<
	{ imported: number; skipped: number; errors: readonly string[] },
	DatabaseError,
	IProductRepository
> =>
	Effect.gen(function* () {
		const repo = yield* IProductRepository;
		let imported = 0;
		let skipped = 0;
		const errors: string[] = [];

		for (const command of products) {
			const result = yield* Effect.either(
				Effect.gen(function* () {
					// Create domain entities (validates and generates IDs)
					const product = yield* ProductModule.create({
						tenantId,
						name: command.name,
						category: null,
						description: null,
						brand: null,
						imageUrl: null,
						hasVariants: false,
						isActive: true,
						isFeatured: false,
					});

					const variant = yield* ProductModule.createVariant({
						productId: product.id,
						tenantId,
						name: "Default",
						sku: command.sku ?? null,
						barcode: null,
						price: command.price,
						costPrice: 0,
						unit: command.unit ?? "pcs",
						isFractional: command.isFractional ?? false,
						stock: command.stock,
						lowStockThreshold: 5,
						isActive: true,
						sortOrder: 0,
					});

					// Single atomic RPC call — inserts product + variant
					// in one Postgres transaction with SKU check
					yield* repo.importProduct(
						{
							productId: product.id,
							name: product.name,
							category: product.category,
							description: product.description,
							brand: product.brand,
							imageUrl: product.imageUrl,
							hasVariants: product.hasVariants,
							isActive: product.isActive,
							variantId: variant.id,
							variantName: variant.name,
							sku: variant.sku,
							price: variant.price,
							costPrice: variant.costPrice,
							unit: variant.unit,
							isFractional: variant.isFractional,
							stock: variant.stock,
							lowStockThreshold: variant.lowStockThreshold,
							variantIsActive: variant.isActive,
							sortOrder: variant.sortOrder,
						},
						tenantId,
					);
				}),
			);

			if (result._tag === "Right") {
				imported++;
			} else {
				skipped++;
				errors.push(`Gagal import "${command.name}": ${result.left._tag}`);
			}
		}

		return { imported, skipped, errors };
	});
