import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type {
	PromoCodeAlreadyUsedError,
	PromoCodeExpiredError,
	PromoCodeInactiveError,
	PromoCodeMaxUsageExceededError,
	PromoCodeMinOrderError,
} from "./loyalty.errors";
import { LoyaltyModule } from "./loyalty.module";
import { ILoyaltyRepository } from "./loyalty.repository";
import type {
	ApplyPromoCodeCommand,
	CreatePromoCodeCommand,
	EarnPointsCommand,
	RedeemPointsCommand,
	UpdateLoyaltyConfigCommand,
	ValidatePromoCodeCommand,
} from "./loyalty.schemas";
import type {
	TLoyaltyConfig,
	TLoyaltyTier,
	TPromoCode,
	TPromoCodeId,
	TPromoCodeType,
	TPromoUsageRecord,
} from "./loyalty.types";

const createDefaultConfig = (tenantId: TTenantId): TLoyaltyConfig => ({
	businessId: tenantId,
	pointsPerRupiah: 0.01,
	pointsExpiryDays: 365,
	minRedeemPoints: 100,
	isActive: true,
});

export const getLoyaltyConfigProgram = (
	tenantId: TTenantId,
): Effect.Effect<
	{ config: TLoyaltyConfig; tiers: readonly TLoyaltyTier[] },
	DatabaseError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;
		const config = yield* repo.getConfig(tenantId);
		const tiers = yield* repo.getTiers(tenantId);
		return {
			config: config || createDefaultConfig(tenantId),
			tiers,
		};
	});

export const getLoyaltyTransactionsProgram = (
	tenantId: TTenantId,
) =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;
		return yield* repo.getAllPointsTransactions(tenantId);
	});

export const updateLoyaltyConfigProgram = (
	command: UpdateLoyaltyConfigCommand,
	tenantId: TTenantId,
): Effect.Effect<void, DatabaseError, ILoyaltyRepository> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;
		const config: TLoyaltyConfig = {
			businessId: tenantId,
			pointsPerRupiah: command.pointsPerRupiah,
			pointsExpiryDays: command.pointsExpiryDays,
			minRedeemPoints: command.minRedeemPoints,
			isActive: command.isActive,
		};
		yield* repo.updateConfig(config);
	});

export const earnPointsProgram = (
	command: EarnPointsCommand,
	tenantId: TTenantId,
): Effect.Effect<
	{ pointsEarned: number; newTotal: number },
	DatabaseError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const config = yield* repo.getConfig(tenantId);
		if (!config?.isActive) {
			return { pointsEarned: 0, newTotal: 0 };
		}

		const customer = yield* repo.findCustomerById(tenantId, command.customerId);
		if (!customer) {
			return { pointsEarned: 0, newTotal: 0 };
		}

		const pointsEarned = LoyaltyModule.calculatePoints(command.amount, config);
		if (pointsEarned <= 0) {
			return { pointsEarned: 0, newTotal: customer.totalPoints };
		}
		const transaction = LoyaltyModule.createPointsTransaction({
			customerLoyaltyId: customer.id,
			type: "earn",
			points: pointsEarned,
			tenantId,
			description: command.description || "Points earned from order",
			orderId: command.orderId ?? null,
		});

		const newTotal = yield* repo.atomicEarnPoints({
			tenantId,
			customerLoyaltyId: customer.id,
			transactionId: transaction.id,
			points: pointsEarned,
			orderId: command.orderId ?? null,
			description: transaction.description,
		});

		return { pointsEarned, newTotal };
	});

export const redeemPointsProgram = (
	command: RedeemPointsCommand,
	tenantId: TTenantId,
): Effect.Effect<
	{ pointsRedeemed: number; newTotal: number },
	DatabaseError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const config = yield* repo.getConfig(tenantId);
		if (!config?.isActive) {
			return { pointsRedeemed: 0, newTotal: 0 };
		}

		const customer = yield* repo.findCustomerById(tenantId, command.customerId);
		if (!customer) {
			return { pointsRedeemed: 0, newTotal: 0 };
		}

		const validatedNewTotal = yield* LoyaltyModule.validateRedemption(
			customer,
			command.points,
			config,
		);
		if (validatedNewTotal === customer.totalPoints) {
			return { pointsRedeemed: 0, newTotal: customer.totalPoints };
		}

		const pointsRedeemed = customer.totalPoints - validatedNewTotal;
		const transaction = LoyaltyModule.createPointsTransaction({
			customerLoyaltyId: customer.id,
			type: "redeem",
			points: pointsRedeemed,
			tenantId,
			description: command.description || "Points redeemed",
			orderId: command.orderId ?? null,
		});

		const newTotal = yield* repo.atomicRedeemPoints({
			tenantId,
			customerLoyaltyId: customer.id,
			transactionId: transaction.id,
			points: pointsRedeemed,
			orderId: command.orderId ?? null,
			description: transaction.description,
		});

		return { pointsRedeemed, newTotal };
	});

export const evaluateTierProgram = (
	customerId: string,
	tenantId: TTenantId,
): Effect.Effect<
	{ tierChanged: boolean; newTierName: string | null },
	DatabaseError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const customer = yield* repo.findCustomerById(tenantId, customerId);
		if (!customer) {
			return { tierChanged: false, newTierName: null };
		}

		const tiers = yield* repo.getTiers(tenantId);
		const newTier = LoyaltyModule.evaluateTier(customer, tiers);

		if (newTier && newTier.id !== customer.currentTierId) {
			yield* repo.updateCustomerPoints(
				tenantId,
				customer.id,
				customer.totalPoints,
			);
			return { tierChanged: true, newTierName: newTier.name };
		}

		return { tierChanged: false, newTierName: newTier?.name || null };
	});

export const getPromoCodesProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TPromoCode[], DatabaseError, ILoyaltyRepository> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;
		return yield* repo.getPromoCodes(tenantId);
	});

export const getActivePromoCodesProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TPromoCode[], DatabaseError, ILoyaltyRepository> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;
		return yield* repo.getActivePromoCodes(tenantId);
	});

export const createPromoCodeProgram = (
	command: CreatePromoCodeCommand,
	tenantId: TTenantId,
): Effect.Effect<TPromoCode, DatabaseError, ILoyaltyRepository> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;
		const _now = new Date().toISOString();

		const promoCode: TPromoCode = {
			id: generateId() as TPromoCodeId,
			tenantId,
			code: command.code.toUpperCase(),
			name: command.name,
			description: command.description ?? "",
			type: command.type as TPromoCodeType,
			value: command.value,
			minOrderAmount: command.minOrderAmount ?? 0,
			maxDiscountAmount: command.maxDiscountAmount ?? null,
			maxUses: command.maxUses ?? null,
			usedCount: 0,
			maxUsesPerCustomer: command.maxUsesPerCustomer ?? 1,
			validFrom: command.validFrom.toISOString(),
			validUntil: command.validUntil.toISOString(),
			isActive: true,
			applicableServices: [],
		};

		yield* repo.createPromoCode(promoCode);
		return promoCode;
	});

export const validatePromoCodeProgram = (
	command: ValidatePromoCodeCommand,
	tenantId: TTenantId,
): Effect.Effect<
	{ valid: boolean; discount: number; rejectionReason: string | null },
	| DatabaseError
	| PromoCodeInactiveError
	| PromoCodeExpiredError
	| PromoCodeMaxUsageExceededError
	| PromoCodeMinOrderError
	| PromoCodeAlreadyUsedError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const promoCode = yield* repo.findPromoCodeByCode(tenantId, command.code);
		if (!promoCode) {
			return {
				valid: false,
				discount: 0,
				rejectionReason: `Promo code "${command.code}" not found`,
			};
		}

		const now = new Date().toISOString();
		const customerUsageCount = command.customerLoyaltyId
			? (yield* repo.getCustomerPromoUsage(
					tenantId,
					promoCode.id,
					command.customerLoyaltyId,
				)).length
			: 0;

		const result = yield* LoyaltyModule.validatePromoCode(
			promoCode,
			command.orderTotal,
			customerUsageCount,
			now,
		).pipe(
			Effect.match({
				onSuccess: (discount) => ({
					valid: true,
					discount,
					rejectionReason: null,
				}),
				onFailure: (err) => ({
					valid: false,
					discount: 0,
					rejectionReason: err.detail,
				}),
			}),
		);

		return result;
	});

export const applyPromoCodeProgram = (
	command: ApplyPromoCodeCommand,
	tenantId: TTenantId,
): Effect.Effect<
	{ discount: number; newTotal: number },
	| DatabaseError
	| PromoCodeInactiveError
	| PromoCodeExpiredError
	| PromoCodeMaxUsageExceededError
	| PromoCodeMinOrderError
	| PromoCodeAlreadyUsedError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const promoCode = yield* repo.findPromoCodeByCode(tenantId, command.code);
		if (!promoCode) {
			return { discount: 0, newTotal: command.orderTotal };
		}

		const now = new Date().toISOString();
		const customerUsageCount = command.customerLoyaltyId
			? (yield* repo.getCustomerPromoUsage(
					tenantId,
					promoCode.id,
					command.customerLoyaltyId,
				)).length
			: 0;

		const discount = yield* LoyaltyModule.validatePromoCode(
			promoCode,
			command.orderTotal,
			customerUsageCount,
			now,
		);

		const usageRecord: TPromoUsageRecord = {
			id: generateId(),
			tenantId,
			promoCodeId: promoCode.id,
			customerLoyaltyId: command.customerLoyaltyId ?? null,
			orderId: command.orderId,
			discountAmount: discount,
			usedAt: now,
		};

		yield* repo.savePromoUsage(usageRecord);
		yield* repo.incrementPromoUsage(tenantId, promoCode.id);

		const newTotal = Math.max(0, command.orderTotal - discount);
		return { discount, newTotal };
	});
