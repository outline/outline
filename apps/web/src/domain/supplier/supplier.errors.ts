import { Data } from "effect";

export class SupplierNotFoundError extends Data.TaggedError(
	"SupplierNotFoundError",
)<{
	readonly id: string;
}> {}
