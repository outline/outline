import { Data } from "effect";

export class RoomNotFoundError extends Data.TaggedError("RoomNotFoundError")<{
	readonly roomId: string;
}> {}

export class SeasonalPricingNotFoundError extends Data.TaggedError(
	"SeasonalPricingNotFoundError",
)<{
	readonly pricingId: string;
}> {}
