import { Data } from "effect";

export class BoardingNotFoundError extends Data.TaggedError(
	"BoardingNotFoundError",
)<{
	readonly id: string;
}> {}

export class InvalidCheckOutDateError extends Data.TaggedError(
	"InvalidCheckOutDateError",
)<{
	readonly checkInDate: Date;
	readonly estimatedCheckOutDate: Date;
}> {}

export class NoPetsProvidedError extends Data.TaggedError(
	"NoPetsProvidedError",
)<Record<string, never>> {}

export class InvalidStatusTransitionError extends Data.TaggedError(
	"InvalidStatusTransitionError",
)<{
	readonly currentStatus: string;
	readonly nextStatus: string;
}> {}
