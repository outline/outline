import type { TId, TTenantId } from "@/shared/types/common.types";

export type TProductId = TId & { readonly _brand: "ProductId" };
export type TProductVariantId = TId & { readonly _brand: "ProductVariantId" };

export const PRODUCT_UNITS = [
	"pcs",
	"pack",
	"botol",
	"kaleng",
	"sachet",
	"box",
	"kg",
	"gram",
	"liter",
	"ml",
] as const;

export type TProductUnit = (typeof PRODUCT_UNITS)[number];

export type TProduct = {
	readonly id: TProductId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly category: string | null;
	readonly description: string | null;
	readonly brand: string | null;
	readonly imageUrl: string | null;
	readonly hasVariants: boolean;
	readonly isActive: boolean;
	readonly isFeatured: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TProductProps = Omit<TProduct, "id" | "createdAt" | "updatedAt">;

export type TProductVariant = {
	readonly id: TProductVariantId;
	readonly productId: TProductId;
	readonly tenantId: TTenantId;
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
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TProductVariantProps = Omit<
	TProductVariant,
	"id" | "createdAt" | "updatedAt"
>;

export type TProductWithVariants = TProduct & {
	readonly variants: readonly TProductVariant[];
};
