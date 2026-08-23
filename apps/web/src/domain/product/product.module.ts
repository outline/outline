import { Effect, pipe } from "effect";
import { generateId } from "@/shared/utils";
import { NegativePriceError, NegativeStockError } from "./product.errors";
import type {
	TProduct,
	TProductId,
	TProductProps,
	TProductVariant,
	TProductVariantId,
	TProductVariantProps,
} from "./product.types";

export const ProductModule = {
	// ─── Product ────────────────────────────────────────────────────────────
	create: (props: TProductProps): Effect.Effect<TProduct, never> =>
		Effect.succeed({
			...props,
			isFeatured: props.isFeatured ?? false,
			id: generateId() as TProductId,
			createdAt: new Date(),
			updatedAt: new Date(),
		}),

	update: (
		product: TProduct,
		updates: Partial<Omit<TProductProps, "id" | "tenantId">>,
	): Effect.Effect<TProduct, never> =>
		Effect.succeed({
			...product,
			...updates,
			updatedAt: new Date(),
		}),

	reconstitute: (raw: TProduct): TProduct => ({ ...raw }),

	// ─── Variant ────────────────────────────────────────────────────────────
	createVariant: (
		props: TProductVariantProps,
	): Effect.Effect<TProductVariant, NegativePriceError | NegativeStockError> =>
		pipe(
			Effect.all([
				props.price < 0
					? Effect.fail(new NegativePriceError({ price: props.price }))
					: Effect.succeed(props.price),
				props.stock < 0
					? Effect.fail(new NegativeStockError({ stock: props.stock }))
					: Effect.succeed(props.stock),
			]),
			Effect.map(() => ({
				...props,
				id: generateId() as TProductVariantId,
				createdAt: new Date(),
				updatedAt: new Date(),
			})),
		),

	updateVariant: (
		variant: TProductVariant,
		updates: Partial<
			Omit<TProductVariantProps, "id" | "tenantId" | "productId">
		>,
	): Effect.Effect<TProductVariant, NegativePriceError | NegativeStockError> =>
		pipe(
			Effect.all([
				updates.price !== undefined && updates.price < 0
					? Effect.fail(new NegativePriceError({ price: updates.price }))
					: Effect.succeed(undefined),
				updates.stock !== undefined && updates.stock < 0
					? Effect.fail(new NegativeStockError({ stock: updates.stock }))
					: Effect.succeed(undefined),
			]),
			Effect.map(() => ({
				...variant,
				...updates,
				updatedAt: new Date(),
			})),
		),

	isLowStock: (variant: TProductVariant): boolean =>
		variant.stock > 0 && variant.stock <= variant.lowStockThreshold,
	isOutOfStock: (variant: TProductVariant): boolean => variant.stock <= 0,
} as const;
