import type { TId, TTenantId } from "@/shared/types/common.types";

export type TLoyaltyTierId = TId & { readonly _brand: "LoyaltyTierId" };
export type TCustomerLoyaltyId = TId & { readonly _brand: "CustomerLoyaltyId" };
export type TPromoCodeId = TId & { readonly _brand: "PromoCodeId" };
export type TStampCardId = TId & { readonly _brand: "StampCardId" };
export type TPointsTransactionId = TId & {
	readonly _brand: "PointsTransactionId";
};

export type TLoyaltyConfig = {
	readonly businessId: TTenantId;
	readonly pointsPerRupiah: number;
	readonly pointsExpiryDays: number;
	readonly minRedeemPoints: number;
	readonly isActive: boolean;
};

export type TLoyaltyTier = {
	readonly id: TLoyaltyTierId;
	readonly tenantId: TTenantId;
	readonly name: string;
	readonly minPoints: number;
	readonly discountPercent: number;
	readonly benefits: readonly string[];
};

export type TCustomerLoyalty = {
	readonly id: TCustomerLoyaltyId;
	readonly tenantId: TTenantId;
	readonly customerName: string;
	readonly customerPhone: string;
	readonly totalPoints: number;
	readonly currentTierId: TLoyaltyTierId | null;
};

export type TPointsTransaction = {
	readonly id: TPointsTransactionId;
	readonly tenantId: TTenantId;
	readonly customerLoyaltyId: TCustomerLoyaltyId;
	readonly type: "earn" | "redeem" | "expire" | "adjust";
	readonly points: number;
	readonly description: string;
	readonly orderId: string | null;
	readonly createdAt: Date;
};

export type TStampCard = {
	readonly id: TStampCardId;
	readonly tenantId: TTenantId;
	readonly customerId: string;
	readonly petId: string | null;
	readonly totalStamps: number;
	readonly currentStamps: number;
	readonly isRedeemed: boolean;
	readonly createdAt: Date;
};

export type TPromoCodeType = "percentage" | "fixed" | "free_service";

export type TPromoCode = {
	readonly id: TPromoCodeId;
	readonly tenantId: TTenantId;
	readonly code: string;
	readonly name: string;
	readonly description: string;
	readonly type: TPromoCodeType;
	readonly value: number;
	readonly minOrderAmount: number;
	readonly maxDiscountAmount: number | null;
	readonly maxUses: number | null;
	readonly usedCount: number;
	readonly maxUsesPerCustomer: number;
	readonly validFrom: string;
	readonly validUntil: string;
	readonly isActive: boolean;
	readonly applicableServices: readonly string[];
};

export type TPromoUsageRecord = {
	readonly id: string;
	readonly tenantId: TTenantId;
	readonly promoCodeId: TPromoCodeId;
	readonly customerLoyaltyId: string | null;
	readonly orderId: string | null;
	readonly discountAmount: number;
	readonly usedAt: string;
};

export type TPromoValidationResult = {
	readonly valid: boolean;
	readonly promoCode: TPromoCode;
	readonly calculatedDiscount: number;
	readonly rejectionReason: string | null;
};
