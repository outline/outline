import { Data } from "effect";

export class InvoiceNotFoundError extends Data.TaggedError(
	"InvoiceNotFoundError",
)<{
	readonly message: string;
}> {}

export class InvoiceValidationError extends Data.TaggedError(
	"InvoiceValidationError",
)<{
	readonly message: string;
}> {}
