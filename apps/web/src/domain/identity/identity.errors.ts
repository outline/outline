import { Data } from "effect";

export class ProfileNotFoundError extends Data.TaggedError(
	"ProfileNotFoundError",
)<{
	readonly userId: string;
}> {}

export class BusinessNotFoundError extends Data.TaggedError(
	"BusinessNotFoundError",
)<{
	readonly id: string;
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
	readonly message: string;
}> {}

export class WrongCurrentPasswordError extends Data.TaggedError(
	"WrongCurrentPasswordError",
)<{
	readonly message: string;
}> {}
