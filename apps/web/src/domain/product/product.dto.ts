import type { TProduct, TProductUnit, TProductVariant } from "./product.types";

// ─── Variant DTO ─────────────────────────────────────────────────────────────

export type TProductVariantDto = {
	readonly id: string;
	readonly productId: string;
	readonly name: string;
	readonly sku: string | null;
	readonly barcode: string | null;
	readonly price: number;
	readonly costPrice: number;
	readonly unit: TProductUnit;
	readonly isFractional: boolean;
	readonly stock: number;
	readonly lowStockThreshold: number;
	readonly isActive: boolean;
	readonly sortOrder: number;
	readonly isLowStock: boolean;
	readonly isOutOfStock: boolean;
};

export const toProductVariantDto = (
	v: TProductVariant,
): TProductVariantDto => ({
	id: v.id,
	productId: v.productId,
	name: v.name,
	sku: v.sku,
	barcode: v.barcode,
	price: v.price,
	costPrice: v.costPrice,
	unit: v.unit,
	isFractional: v.isFractional,
	stock: v.stock,
	lowStockThreshold: v.lowStockThreshold,
	isActive: v.isActive,
	sortOrder: v.sortOrder,
	isLowStock: v.stock > 0 && v.stock <= v.lowStockThreshold,
	isOutOfStock: v.stock <= 0,
});

// ─── Product DTO ──────────────────────────────────────────────────────────────

export type TProductDto = {
	readonly id: string;
	readonly name: string;
	readonly category: string | null;
	readonly description: string | null;
	readonly brand: string | null;
	readonly imageUrl: string | null;
	readonly hasVariants: boolean;
	readonly isActive: boolean;
	readonly isFeatured: boolean;
	readonly variants: readonly TProductVariantDto[];
	readonly createdAt: string;
	readonly updatedAt: string;
};

export const toProductDto = (
	product: TProduct,
	variants: readonly TProductVariant[] = [],
): TProductDto => ({
	id: product.id,
	name: product.name,
	category: product.category,
	description: product.description,
	brand: product.brand,
	imageUrl: product.imageUrl,
	hasVariants: product.hasVariants,
	isActive: product.isActive,
	isFeatured: product.isFeatured,
	variants: variants.map(toProductVariantDto),
	createdAt: product.createdAt.toISOString(),
	updatedAt: product.updatedAt.toISOString(),
});

// ─── Legacy compat (used by POS cart) ────────────────────────────────────────

/** Returns first active variant price for backward compat */
export const getDefaultVariant = (
	dto: TProductDto,
): TProductVariantDto | null => dto.variants.find((v) => v.isActive) ?? null;
