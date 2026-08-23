import { Data } from "effect";

export class ProductNotFoundError extends Data.TaggedError(
	"ProductNotFoundError",
)<{
	readonly id: string;
}> {}

export class DuplicateSkuError extends Data.TaggedError("DuplicateSkuError")<{
	readonly sku: string;
}> {}

export class NegativeStockError extends Data.TaggedError("NegativeStockError")<{
	readonly stock: number;
}> {}

export class NegativePriceError extends Data.TaggedError("NegativePriceError")<{
	readonly price: number;
}> {}

export class ProductAlreadyDeletedError extends Data.TaggedError(
	"ProductAlreadyDeletedError",
)<{
	readonly id: string;
}> {}

export class ProductRestoreWindowExpiredError extends Data.TaggedError(
	"ProductRestoreWindowExpiredError",
)<{
	readonly id: string;
	readonly deletedAt: Date;
}> {}

export class ProductNotDeletedError extends Data.TaggedError(
	"ProductNotDeletedError",
)<{
	readonly id: string;
}> {}
