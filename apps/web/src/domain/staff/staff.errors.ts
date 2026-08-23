import { Data } from "effect";

export class StaffNotFoundError extends Data.TaggedError("StaffNotFoundError")<{
	readonly email: string;
}> {}

export class UserNotRegisteredError extends Data.TaggedError(
	"UserNotRegisteredError",
)<{
	readonly email: string;
}> {}
