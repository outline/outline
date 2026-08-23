import { Context, type Effect } from "effect";
import type { TProductVariantId } from "@/domain/product/product.types";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type { TProductBatch, TStockMovement } from "./inventory.types";

export interface IInventoryRepository {
	readonly findBatchesByVariant: (
		variantId: TProductVariantId,
		tenantId: TTenantId,
	) => Effect.Effect<readonly TProductBatch[], DatabaseError>;

	readonly findBatchesWithStock: (
		variantId: TProductVariantId,
		tenantId: TTenantId,
	) => Effect.Effect<readonly TProductBatch[], DatabaseError>;

	readonly findExpiringBatches: (
		tenantId: TTenantId,
		days: number,
	) => Effect.Effect<readonly TProductBatch[], DatabaseError>;

	readonly addBatch: (
		params: {
			readonly batchId: string;
			readonly variantId: string;
			readonly batchNumber: string | null;
			readonly quantity: number;
			readonly costPrice: number;
			readonly expiryDate: Date | null;
			readonly supplierId: string | null;
			readonly poId: string | null;
			readonly notes: string | null;
		},
		tenantId: TTenantId,
	) => Effect.Effect<{ readonly batchId: string }, DatabaseError>;

	readonly deductStock: (
		params: {
			readonly variantId: string;
			readonly totalQuantity: number;
			readonly referenceType: string;
			readonly referenceId: string;
			readonly notes: string | null;
			readonly deductions: ReadonlyArray<{
				readonly batchId: string;
				readonly deductQty: number;
			}>;
		},
		tenantId: TTenantId,
	) => Effect.Effect<void, DatabaseError>;

	readonly findMovementsByVariant: (
		variantId: TProductVariantId,
		tenantId: TTenantId,
	) => Effect.Effect<readonly TStockMovement[], DatabaseError>;
}

export const InventoryRepository = Context.GenericTag<IInventoryRepository>(
	"InventoryRepository",
);
