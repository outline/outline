import { Data } from "effect";

export class AccountNotFoundError extends Data.TaggedError(
	"AccountNotFoundError",
)<{
	readonly id: string;
}> {}

export class DuplicateAccountCodeError extends Data.TaggedError(
	"DuplicateAccountCodeError",
)<{
	readonly code: string;
}> {}

export class JournalEntryUnbalancedError extends Data.TaggedError(
	"JournalEntryUnbalancedError",
)<{
	readonly debit: number;
	readonly credit: number;
}> {}
