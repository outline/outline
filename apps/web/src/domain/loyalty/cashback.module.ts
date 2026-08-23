import type { TLoyaltyConfig, TLoyaltyTier } from "./loyalty.types";

export type TCashbackRate = {
	readonly baseRate: number;
	readonly tierMultiplier: number;
	readonly effectiveRate: number;
};

export const CashbackModule = {
	calculateCashbackRate: (
		config: TLoyaltyConfig,
		tier: TLoyaltyTier | null,
	): TCashbackRate => {
		const baseRate = config.pointsPerRupiah;
		const tierMultiplier = tier ? 1 + tier.discountPercent / 100 : 1;
		return {
			baseRate,
			tierMultiplier,
			effectiveRate: baseRate * tierMultiplier,
		};
	},

	calculateCashbackPoints: (
		amount: number,
		config: TLoyaltyConfig,
		tier: TLoyaltyTier | null,
	): number => {
		if (!config.isActive) return 0;
		const rate = CashbackModule.calculateCashbackRate(config, tier);
		return Math.floor(amount * rate.effectiveRate);
	},

	calculatePointsValue: (points: number, config: TLoyaltyConfig): number => {
		if (config.minRedeemPoints > 0 && points < config.minRedeemPoints) return 0;
		return (
			Math.floor(points / config.minRedeemPoints) *
			(config.minRedeemPoints / 100)
		);
	},

	evaluateCashbackPreview: (
		amount: number,
		config: TLoyaltyConfig,
		tier: TLoyaltyTier | null,
		currentPoints: number,
	): {
		readonly basePoints: number;
		readonly tierMultiplier: number;
		readonly bonusPoints: number;
		readonly totalEarned: number;
		readonly pointsValue: number;
		readonly totalAfterPurchase: number;
	} => {
		const rate = CashbackModule.calculateCashbackRate(config, tier);
		const basePoints = Math.floor(amount * rate.baseRate);
		const tierPoints = Math.floor(amount * rate.effectiveRate);
		const bonusPoints = tierPoints - basePoints;
		const totalEarned = tierPoints;
		const totalAfterPurchase = currentPoints + totalEarned;
		const pointsValue = CashbackModule.calculatePointsValue(
			totalAfterPurchase,
			config,
		);

		return {
			basePoints,
			tierMultiplier: rate.tierMultiplier,
			bonusPoints,
			totalEarned,
			pointsValue,
			totalAfterPurchase,
		};
	},
} as const;
