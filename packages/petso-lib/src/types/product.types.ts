export type TProductVariantDto = {
	readonly id: string;
	readonly productId: string;
	readonly name: string;
	readonly sku: string | null;
	readonly barcode: string | null;
	readonly price: number;
	readonly costPrice?: number;
	readonly unit: string;
	readonly stock: number;
	readonly lowStockThreshold?: number;
	readonly isActive: boolean;
	readonly sortOrder: number;
	readonly createdAt: string;
	readonly updatedAt: string;
};

export interface TAdminProductInput {
	readonly id?: string;
	readonly name: string;
	readonly sku: string;
	readonly category: string;
	readonly price: number;
	readonly stock: number;
	readonly reorderLevel: number;
}

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

export type TProductListParams = {
	readonly search?: string;
	readonly category?: string;
	readonly isFeatured?: boolean;
	readonly minPrice?: number;
	readonly maxPrice?: number;
	readonly sort?: "newest" | "popular";
	readonly limit?: number;
	readonly offset?: number;
};

export type TProductListResult = {
	readonly products: readonly TProductDto[];
	readonly total: number;
};

export type TProductSuggestResult = readonly TProductDto[];
