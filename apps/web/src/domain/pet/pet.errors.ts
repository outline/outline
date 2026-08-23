import { Data } from "effect";

export class PetNotFoundError extends Data.TaggedError("PetNotFoundError")<{
	readonly id: string;
}> {}
