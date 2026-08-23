import { Context, type Effect } from "effect";

export class RateLimitError extends Error {
	readonly _tag = "RateLimitError";
	constructor(
		message: string,
		options?: { readonly cause?: unknown; readonly retryAfterSeconds?: number },
	) {
		super(message, options);
		this.name = "RateLimitError";
		this.retryAfterSeconds = options?.retryAfterSeconds ?? 0;
	}

	readonly retryAfterSeconds: number;
}

export type TRateLimitCheckInput = {
	readonly scope: string;
	readonly key: string;
	readonly limit: number;
	readonly windowSeconds: number;
};

export type TRateLimitCheckResult = {
	readonly allowed: boolean;
	readonly retryAfterSeconds: number;
};

export class IRateLimit extends Context.Tag("IRateLimit")<
	IRateLimit,
	{
		readonly check: (
			input: TRateLimitCheckInput,
		) => Effect.Effect<TRateLimitCheckResult, RateLimitError>;
	}
>() {}
