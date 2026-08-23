import { Data } from "effect";

export class EmailAlreadyExistsError extends Data.TaggedError(
	"EmailAlreadyExistsError",
)<{
	readonly email: string;
}> {}
