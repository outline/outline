import { Data } from "effect";
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
	readonly cause: unknown;
	readonly detail: string;
}> {
	constructor(opts: { cause: unknown }) {
		const cause = opts.cause;
		let detail = String(cause);
		if (cause instanceof Error) {
			const e = cause as Error & {
				detail?: string;
				hint?: string;
				code?: string;
			};
			detail = e.message ?? String(e);
			if (e.detail) detail += ` | DETAIL: ${e.detail}`;
			if (e.hint) detail += ` | HINT: ${e.hint}`;
			if (e.code) detail += ` | CODE: ${e.code}`;
		}
		super({ cause, detail });
	}
}
