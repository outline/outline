export interface TLoyaltyTierDto {
	readonly name: string;
	readonly minPoints: number;
	readonly discountPercent: number;
}

export interface TLoyaltyConfigDto {
	readonly pointsPerRupiah: number;
	readonly pointsExpiryDays: number;
	readonly minRedeemPoints: number;
	readonly isActive: boolean;
	readonly tiers: readonly TLoyaltyTierDto[];
}

export interface TUpdateLoyaltyConfigInput {
	readonly pointsPerRupiah: number;
	readonly pointsExpiryDays: number;
	readonly minRedeemPoints: number;
	readonly isActive: boolean;
}
