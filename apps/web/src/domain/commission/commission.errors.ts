import { Data } from "effect";

export class CommissionRuleNotFoundError extends Data.TaggedError(
	"CommissionRuleNotFoundError",
)<{
	readonly id: string;
}> {}

export class CommissionRecordNotFoundError extends Data.TaggedError(
	"CommissionRecordNotFoundError",
)<{
	readonly id: string;
}> {}

export class KasbonNotFoundError extends Data.TaggedError(
	"KasbonNotFoundError",
)<{
	readonly id: string;
}> {}
