import { Data } from "effect";

export class InvalidResetTokenError extends Data.TaggedError(
	"InvalidResetTokenError",
)<{
	readonly message: string;
}> {}

export class WeakPasswordError extends Data.TaggedError("WeakPasswordError")<{
	readonly message: string;
}> {}
