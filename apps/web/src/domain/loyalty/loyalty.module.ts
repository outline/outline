import { Effect } from "effect";
import { generateId } from "@/shared/utils";
import {
	PromoCodeAlreadyUsedError,
	PromoCodeExpiredError,
	PromoCodeInactiveError,
	PromoCodeMaxUsageExceededError,
	PromoCodeMinOrderError,
} from "./loyalty.errors";
import type {
	TCustomerLoyalty,
	TCustomerLoyaltyId,
	TLoyaltyConfig,
	TLoyaltyTier,
	TPointsTransaction,
	TPointsTransactionId,
	TPromoCode,
} from "./loyalty.types";

export const LoyaltyModule = {
	calculatePoints: (amount: number, config: TLoyaltyConfig): number =>
		Math.floor(amount * config.pointsPerRupiah),

	validateRedemption: (
		customer: TCustomerLoyalty,
		points: number,
		config: TLoyaltyConfig,
	): Effect.Effect<number, never> => {
		if (!config.isActive) return Effect.succeed(0);
		if (points < config.minRedeemPoints) return Effect.succeed(0);
		if (customer.totalPoints < points) return Effect.succeed(0);
		return Effect.succeed(customer.totalPoints - points);
	},

	evaluateTier: (
		customer: TCustomerLoyalty,
		tiers: readonly TLoyaltyTier[],
	): TLoyaltyTier | null => {
		if (tiers.length === 0) return null;
		let matched: TLoyaltyTier | null = null;
		for (const tier of tiers) {
			if (customer.totalPoints >= tier.minPoints) {
				matched = tier;
			}
		}
		return matched;
	},

	createPointsTransaction: (params: {
		customerLoyaltyId: string;
		type: TPointsTransaction["type"];
		points: number;
		tenantId: string;
		description?: string;
		orderId?: string | null;
	}): TPointsTransaction => ({
		id: generateId() as TPointsTransactionId,
		tenantId:
			params.tenantId as import("@/shared/types/common.types").TTenantId,
		customerLoyaltyId: params.customerLoyaltyId as TCustomerLoyaltyId,
		points: params.points,
		type: params.type,
		description: params.description || "",
		orderId: params.orderId ?? null,
		createdAt: new Date(),
	}),

	findPromoCode: (
		codes: readonly TPromoCode[],
		code: string,
	): TPromoCode | null => {
		const found = codes.find(
			(p) => p.code.toLowerCase() === code.toLowerCase(),
		);
		return found ?? null;
	},

	isPromoCodeValid: (promoCode: TPromoCode, now: string): boolean => {
		if (!promoCode.isActive) return false;
		if (now < promoCode.validFrom || now > promoCode.validUntil) return false;
		if (promoCode.maxUses !== null && promoCode.usedCount >= promoCode.maxUses)
			return false;
		return true;
	},

	checkMinOrder: (promoCode: TPromoCode, orderTotal: number): boolean => {
		return orderTotal >= promoCode.minOrderAmount;
	},

	checkCustomerUsage: (
		promoCode: TPromoCode,
		usageRecords: readonly string[],
	): boolean => {
		if (usageRecords.length >= promoCode.maxUsesPerCustomer) return false;
		return true;
	},

	calculatePromoDiscount: (
		promoCode: TPromoCode,
		orderTotal: number,
	): number => {
		if (promoCode.type === "percentage") {
			const discount = (orderTotal * promoCode.value) / 100;
			if (
				promoCode.maxDiscountAmount !== null &&
				discount > promoCode.maxDiscountAmount
			) {
				return promoCode.maxDiscountAmount;
			}
			return discount;
		}
		if (promoCode.type === "fixed") {
			if (
				promoCode.maxDiscountAmount !== null &&
				promoCode.value > promoCode.maxDiscountAmount
			) {
				return promoCode.maxDiscountAmount;
			}
			return promoCode.value;
		}
		return 0;
	},

	validatePromoCode: (
		promoCode: TPromoCode,
		orderTotal: number,
		customerUsageCount: number,
		now: string,
	): Effect.Effect<
		number,
		| PromoCodeExpiredError
		| PromoCodeInactiveError
		| PromoCodeMaxUsageExceededError
		| PromoCodeMinOrderError
		| PromoCodeAlreadyUsedError
	> =>
		Effect.gen(function* () {
			if (!promoCode.isActive) {
				return yield* Effect.fail(new PromoCodeInactiveError(promoCode.code));
			}
			if (now < promoCode.validFrom || now > promoCode.validUntil) {
				return yield* Effect.fail(new PromoCodeExpiredError(promoCode.code));
			}
			if (
				promoCode.maxUses !== null &&
				promoCode.usedCount >= promoCode.maxUses
			) {
				return yield* Effect.fail(
					new PromoCodeMaxUsageExceededError(promoCode.code),
				);
			}
			if (orderTotal < promoCode.minOrderAmount) {
				return yield* Effect.fail(
					new PromoCodeMinOrderError(
						promoCode.code,
						promoCode.minOrderAmount,
						orderTotal,
					),
				);
			}
			if (customerUsageCount >= promoCode.maxUsesPerCustomer) {
				return yield* Effect.fail(
					new PromoCodeAlreadyUsedError(promoCode.code),
				);
			}
			const discount =
				promoCode.type === "percentage"
					? Math.min(
							(orderTotal * promoCode.value) / 100,
							promoCode.maxDiscountAmount ?? Infinity,
						)
					: Math.min(promoCode.value, promoCode.maxDiscountAmount ?? Infinity);
			return discount > orderTotal ? orderTotal : discount;
		}),

	reconstitute: <T>(raw: T): T => ({ ...raw }),
} as const;
