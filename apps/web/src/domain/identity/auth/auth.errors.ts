import { Data } from "effect";

export class InvalidCredentialsError extends Data.TaggedError(
	"InvalidCredentialsError",
)<Record<string, never>> {}

export class RateLimitedError extends Data.TaggedError("RateLimitedError")<
	Record<string, never>
> {}
