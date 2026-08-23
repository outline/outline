import { Data } from "effect";

export class PurchaseOrderNotFoundError extends Data.TaggedError(
	"PurchaseOrderNotFoundError",
)<{
	readonly id: string;
}> {}

export class InvalidPoStatusError extends Data.TaggedError(
	"InvalidPoStatusError",
)<{
	readonly currentStatus: string;
	readonly attemptedAction: string;
}> {}

export class OverReceiveError extends Data.TaggedError("OverReceiveError")<{
	readonly poItemId: string;
	readonly qtyOrdered: number;
	readonly currentReceived: number;
	readonly attemptedReceive: number;
}> {}
