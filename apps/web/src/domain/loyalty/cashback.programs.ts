import { Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import { CashbackModule } from "./cashback.module";
import { LoyaltyModule } from "./loyalty.module";
import { ILoyaltyRepository } from "./loyalty.repository";

export const getCashbackPreviewProgram = (
	customerId: string,
	amount: number,
	tenantId: TTenantId,
): Effect.Effect<
	{
		readonly basePoints: number;
		readonly tierMultiplier: number;
		readonly bonusPoints: number;
		readonly totalEarned: number;
		readonly pointsValue: number;
		readonly totalAfterPurchase: number;
	} | null,
	DatabaseError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const config = yield* repo.getConfig(tenantId);
		if (!config?.isActive) return null;

		const customer = yield* repo.findCustomerById(tenantId, customerId);
		if (!customer) return null;

		const tiers = yield* repo.getTiers(tenantId);
		const currentTier = LoyaltyModule.evaluateTier(customer, tiers);

		const preview = CashbackModule.evaluateCashbackPreview(
			amount,
			config,
			currentTier,
			customer.totalPoints,
		);

		return preview;
	});

export const getCashbackPreviewByPhoneProgram = (
	phone: string,
	amount: number,
	tenantId: TTenantId,
): Effect.Effect<
	{
		readonly basePoints: number;
		readonly tierMultiplier: number;
		readonly bonusPoints: number;
		readonly totalEarned: number;
		readonly pointsValue: number;
		readonly totalAfterPurchase: number;
	} | null,
	DatabaseError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const config = yield* repo.getConfig(tenantId);
		if (!config?.isActive) return null;

		const customer = yield* repo.findCustomerByPhone(tenantId, phone);
		if (!customer) return null;

		const tiers = yield* repo.getTiers(tenantId);
		const currentTier = LoyaltyModule.evaluateTier(customer, tiers);

		const preview = CashbackModule.evaluateCashbackPreview(
			amount,
			config,
			currentTier,
			customer.totalPoints,
		);

		return preview;
	});

export const autoEarnCashbackProgram = (
	customerId: string,
	orderId: string,
	amount: number,
	tenantId: TTenantId,
): Effect.Effect<
	{ pointsEarned: number; newTotal: number },
	DatabaseError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const config = yield* repo.getConfig(tenantId);
		if (!config?.isActive) return { pointsEarned: 0, newTotal: 0 };

		const customer = yield* repo.findCustomerById(tenantId, customerId);
		if (!customer) return { pointsEarned: 0, newTotal: 0 };

		const tiers = yield* repo.getTiers(tenantId);
		const currentTier = LoyaltyModule.evaluateTier(customer, tiers);

		const pointsEarned = CashbackModule.calculateCashbackPoints(
			amount,
			config,
			currentTier,
		);

		if (pointsEarned <= 0)
			return { pointsEarned: 0, newTotal: customer.totalPoints };

		const transaction = LoyaltyModule.createPointsTransaction({
			customerLoyaltyId: customer.id,
			type: "earn",
			points: pointsEarned,
			tenantId,
			description: `Cashback dari pembelian Rp ${amount.toLocaleString("id-ID")}`,
			orderId,
		});

		const newTotal = yield* repo.atomicEarnPoints({
			tenantId,
			customerLoyaltyId: customer.id,
			transactionId: transaction.id,
			points: pointsEarned,
			orderId,
			description: transaction.description,
		});

		const _updatedTier = LoyaltyModule.evaluateTier(
			{ ...customer, totalPoints: newTotal },
			tiers,
		);

		return { pointsEarned, newTotal };
	});

export const redeemCashbackProgram = (
	customerId: string,
	points: number,
	orderId: string | null,
	tenantId: TTenantId,
): Effect.Effect<
	{ discountAmount: number; pointsRedeemed: number; newTotal: number },
	DatabaseError,
	ILoyaltyRepository
> =>
	Effect.gen(function* () {
		const repo = yield* ILoyaltyRepository;

		const config = yield* repo.getConfig(tenantId);
		if (!config?.isActive) {
			return { discountAmount: 0, pointsRedeemed: 0, newTotal: 0 };
		}

		const customer = yield* repo.findCustomerById(tenantId, customerId);
		if (!customer) {
			return { discountAmount: 0, pointsRedeemed: 0, newTotal: 0 };
		}

		const validatedNewTotal = yield* LoyaltyModule.validateRedemption(
			customer,
			points,
			config,
		);

		if (validatedNewTotal === customer.totalPoints) {
			return {
				discountAmount: 0,
				pointsRedeemed: 0,
				newTotal: customer.totalPoints,
			};
		}

		const pointsRedeemed = customer.totalPoints - validatedNewTotal;
		const discountAmount = CashbackModule.calculatePointsValue(
			pointsRedeemed,
			config,
		);

		const transaction = LoyaltyModule.createPointsTransaction({
			customerLoyaltyId: customer.id,
			type: "redeem",
			points: pointsRedeemed,
			tenantId,
			description: `Cashback redeemed: Rp ${discountAmount.toLocaleString("id-ID")} discount`,
			orderId,
		});

		const newTotal = yield* repo.atomicRedeemPoints({
			tenantId,
			customerLoyaltyId: customer.id,
			transactionId: transaction.id,
			points: pointsRedeemed,
			orderId,
			description: transaction.description,
		});

		return { discountAmount, pointsRedeemed, newTotal };
	});
