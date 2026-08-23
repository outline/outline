import { Data } from "effect";

export class OrderNotFoundError extends Data.TaggedError("OrderNotFoundError")<{
	readonly id: string;
}> {}

export class InsufficientStockError extends Data.TaggedError(
	"InsufficientStockError",
)<{
	readonly productId: string;
	readonly requested: number;
	readonly available: number;
}> {}

export class OrderAlreadyVoidedError extends Data.TaggedError(
	"OrderAlreadyVoidedError",
)<{
	readonly id: string;
}> {}

export class InvalidStatusTransitionError extends Data.TaggedError(
	"InvalidStatusTransitionError",
)<{
	readonly current: string;
	readonly target: string;
}> {
	constructor(current: string, target: string) {
		super({ current, target });
	}
}

export class MissingTrackingInfoError extends Data.TaggedError(
	"MissingTrackingInfoError",
)<Record<string, never>> {
	constructor() {
		super({});
	}
}

export class MissingCancelledReasonError extends Data.TaggedError(
	"MissingCancelledReasonError",
)<Record<string, never>> {
	constructor() {
		super({});
	}
}

const INSUFFICIENT_STOCK_REGEX =
	/INSUFFICIENT_STOCK\|([0-9a-fA-F-]{36})\|(\d+(?:\.\d+)?)\|(-?\d+(?:\.\d+)?)/;

const extractErrorText = (error: unknown): string => {
	if (typeof error === "string") return error;
	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message: unknown }).message;
		if (typeof message === "string") return message;
	}
	return "";
};

/**
 * atomic_create_order raises
 * `INSUFFICIENT_STOCK|<variant_id>|<requested>|<available>`
 * when a completed order would drive variant stock negative.
 */
export const parseInsufficientStockError = (
	error: unknown,
): InsufficientStockError | null => {
	const match = extractErrorText(error).match(INSUFFICIENT_STOCK_REGEX);
	if (!match) return null;
	const [, productId, requested, available] = match;
	if (!productId || !requested || !available) return null;
	return new InsufficientStockError({
		productId,
		requested: Number(requested),
		available: Number(available),
	});
};
