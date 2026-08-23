import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { DuplicateSkuError, ProductNotFoundError } from "./product.errors";
import type {
	TProduct,
	TProductId,
	TProductVariant,
	TProductVariantId,
	TProductWithVariants,
} from "./product.types";

export class IProductRepository extends Context.Tag("IProductRepository")<
	IProductRepository,
	{
		// ─── Product (parent) ─────────────────────────────────────────────────
		readonly findById: (
			id: TProductId,
			tenantId: TTenantId,
		) => Effect.Effect<TProduct | null, DatabaseError>;
		readonly findAllActive: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TProductWithVariants[], DatabaseError>;
		readonly findFeatured: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TProductWithVariants[], DatabaseError>;
		readonly findLowStock: (
			tenantId: TTenantId,
			options?: { limit?: number; offset?: number },
		) => Effect.Effect<
			{
				readonly items: readonly TProductVariant[];
				readonly total: number;
			},
			DatabaseError
		>;
		readonly findPage: (
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
		) => Effect.Effect<
			{
				readonly items: readonly TProductWithVariants[];
				readonly total: number;
			},
			DatabaseError
		>;
		readonly delete: (
			id: TProductId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
		readonly save: (product: TProduct) => Effect.Effect<void, DatabaseError>;
		readonly update: (product: TProduct) => Effect.Effect<void, DatabaseError>;
		readonly saveFull: (
			productWithVariants: TProductWithVariants,
			options: { readonly isNew: boolean },
		) => Effect.Effect<void, DatabaseError | ProductNotFoundError>;

		// ─── Variant ──────────────────────────────────────────────────────────
		readonly findVariantsByProductId: (
			productId: TProductId,
			tenantId: TTenantId,
		) => Effect.Effect<readonly TProductVariant[], DatabaseError>;
		readonly findVariantById: (
			id: TProductVariantId,
			tenantId: TTenantId,
		) => Effect.Effect<TProductVariant | null, DatabaseError>;
		readonly saveVariant: (
			variant: TProductVariant,
		) => Effect.Effect<void, DatabaseError>;
		readonly updateVariant: (
			variant: TProductVariant,
		) => Effect.Effect<void, DatabaseError>;
		readonly deleteVariant: (
			id: TProductVariantId,
			tenantId: TTenantId,
		) => Effect.Effect<void, DatabaseError>;
		readonly existsBySku: (
			sku: string,
			tenantId: TTenantId,
			excludeVariantId?: TProductVariantId,
		) => Effect.Effect<boolean, DatabaseError>;

		// ─── Atomic import ────────────────────────────────────────────────────
		readonly importProduct: (
			params: {
				readonly productId: string;
				readonly name: string;
				readonly category: string | null;
				readonly description: string | null;
				readonly brand: string | null;
				readonly imageUrl: string | null;
				readonly hasVariants: boolean;
				readonly isActive: boolean;
				readonly variantId: string;
				readonly variantName: string;
				readonly sku: string | null;
				readonly price: number;
				readonly costPrice: number;
				readonly unit: string;
				readonly isFractional: boolean;
				readonly stock: number;
				readonly lowStockThreshold: number;
				readonly variantIsActive: boolean;
				readonly sortOrder: number;
			},
			tenantId: TTenantId,
		) => Effect.Effect<
			{ readonly productId: string; readonly variantId: string },
			DatabaseError | DuplicateSkuError
		>;
	}
>() {}
