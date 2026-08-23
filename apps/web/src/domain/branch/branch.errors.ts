import { Data } from "effect";

export class BranchNotFoundError extends Data.TaggedError(
	"BranchNotFoundError",
)<{
	readonly id: string;
}> {}

export class BranchLimitExceededError extends Data.TaggedError(
	"BranchLimitExceededError",
)<{
	readonly limit: number;
}> {}
