import { Effect } from "effect";
import type { TProductVariantId } from "@/domain/product/product.types";
import type { TTenantId } from "@/shared/types/common.types";
import { InsufficientStockError } from "./inventory.errors";
import type { CreateBatchSchema } from "./inventory.schemas";
import type {
	TProductBatch,
	TProductBatchId,
	TPurchaseOrderId,
	TStockMovement,
	TSupplierId,
} from "./inventory.types";

export const createBatchEntity = (
	tenantId: TTenantId,
	data: typeof CreateBatchSchema.Type,
) =>
	Effect.sync(() => {
		const batch: Omit<TProductBatch, "id" | "createdAt" | "updatedAt"> = {
			tenantId,
			variantId: data.variantId as TProductVariantId,
			batchNumber: data.batchNumber,
			quantity: data.quantity,
			initialQty: data.quantity,
			costPrice: data.costPrice,
			receivedAt: new Date(),
			expiryDate: data.expiryDate ? data.expiryDate : null,
			supplierId: data.supplierId as TSupplierId,
			poId: data.poId as TPurchaseOrderId,
			notes: data.notes || null,
		};
		return batch;
	});

export const createMovementEntity = (
	tenantId: TTenantId,
	variantId: TProductVariantId,
	batchId: TProductBatchId | null,
	type: "in" | "out" | "adjustment" | "transfer" | "return",
	quantity: number,
	referenceType: "order" | "po" | "adjustment" | "transfer" | null,
	referenceId: string | null,
	notes: string | null,
) =>
	Effect.sync(() => {
		const movement: Omit<TStockMovement, "id" | "createdAt" | "createdBy"> = {
			tenantId,
			variantId,
			batchId,
			type,
			quantity,
			referenceType,
			referenceId,
			notes,
		};
		return movement;
	});

// Computes the series of deductions from a list of available batches
export const computeFIFODeductions = (
	batches: readonly TProductBatch[],
	requiredQuantity: number,
) =>
	Effect.gen(function* (_) {
		let remainingToDeduct = requiredQuantity;
		const deductions: { batch: TProductBatch; deductQty: number }[] = [];

		const totalAvailable = batches.reduce((acc, b) => acc + b.quantity, 0);
		if (totalAvailable < requiredQuantity) {
			yield* _(
				Effect.fail(
					new InsufficientStockError({
						variantId: batches[0]?.variantId || "",
						required: requiredQuantity,
						available: totalAvailable,
					}),
				),
			);
		}

		for (const batch of batches) {
			if (remainingToDeduct <= 0) break;

			const deductQty = Math.min(batch.quantity, remainingToDeduct);
			deductions.push({ batch, deductQty });
			remainingToDeduct -= deductQty;
		}

		return deductions;
	});
