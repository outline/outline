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

export interface TLoyaltyMovementDto {
	readonly id: string;
	readonly customerId: string;
	readonly customerName: string;
	readonly date: string;
	readonly points: number;
	readonly reason: string;
}
