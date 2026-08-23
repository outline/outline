import { Data } from "effect";

export class BillingEventNotFoundError extends Data.TaggedError(
	"BillingEventNotFoundError",
)<{
	readonly orderId: string;
}> {}

export class PaymentProviderError extends Data.TaggedError(
	"PaymentProviderError",
)<{
	readonly cause: unknown;
}> {}
