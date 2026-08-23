import { Data } from "effect";

export class ReturnNotFoundError extends Data.TaggedError(
	"ReturnNotFoundError",
)<{
	readonly id: string;
}> {}

export class InvalidReturnQuantityError extends Data.TaggedError(
	"InvalidReturnQuantityError",
)<{
	readonly orderItemId: string;
	readonly qtyOrdered: number;
	readonly qtyReturned: number;
}> {}
