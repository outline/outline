import { Data } from "effect";

export class PromoCodeNotFoundError extends Data.TaggedError(
	"PromoCodeNotFoundError",
)<{
	readonly code: string;
	readonly detail: string;
}> {
	constructor(code: string) {
		super({ code, detail: `Promo code "${code}" not found` });
	}
}

export class PromoCodeExpiredError extends Data.TaggedError(
	"PromoCodeExpiredError",
)<{
	readonly code: string;
	readonly detail: string;
}> {
	constructor(code: string) {
		super({ code, detail: `Promo code "${code}" has expired` });
	}
}

export class PromoCodeInactiveError extends Data.TaggedError(
	"PromoCodeInactiveError",
)<{
	readonly code: string;
	readonly detail: string;
}> {
	constructor(code: string) {
		super({ code, detail: `Promo code "${code}" is not active` });
	}
}

export class PromoCodeMaxUsageExceededError extends Data.TaggedError(
	"PromoCodeMaxUsageExceededError",
)<{
	readonly code: string;
	readonly detail: string;
}> {
	constructor(code: string) {
		super({ code, detail: `Promo code "${code}" has reached max usage limit` });
	}
}

export class PromoCodeMinOrderError extends Data.TaggedError(
	"PromoCodeMinOrderError",
)<{
	readonly code: string;
	readonly minOrder: number;
	readonly currentOrder: number;
	readonly detail: string;
}> {
	constructor(code: string, minOrder: number, currentOrder: number) {
		super({
			code,
			minOrder,
			currentOrder,
			detail: `Promo code "${code}" requires minimum order of ${minOrder}`,
		});
	}
}

export class PromoCodeAlreadyUsedError extends Data.TaggedError(
	"PromoCodeAlreadyUsedError",
)<{
	readonly code: string;
	readonly detail: string;
}> {
	constructor(code: string) {
		super({
			code,
			detail: `Promo code "${code}" has already been used by this customer`,
		});
	}
}

export class PromoCodeCustomerNotFoundError extends Data.TaggedError(
	"PromoCodeCustomerNotFoundError",
)<{
	readonly detail: string;
}> {
	constructor() {
		super({ detail: "Customer loyalty record not found for promo validation" });
	}
}
