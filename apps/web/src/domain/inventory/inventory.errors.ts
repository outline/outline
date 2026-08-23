import { Data } from "effect";

export class ProductBatchNotFoundError extends Data.TaggedError(
	"ProductBatchNotFoundError",
)<{
	readonly id: string;
}> {}

export class InsufficientStockError extends Data.TaggedError(
	"InsufficientStockError",
)<{
	readonly variantId: string;
	readonly required: number;
	readonly available: number;
}> {}
