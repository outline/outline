import type { TStaffId } from "@/domain/staff/staff.types";
import type { TId, TTenantId } from "@/shared/types/common.types";

export type TCommissionRuleId = TId & { readonly _brand: "CommissionRuleId" };
export type TCommissionRecordId = TId & {
	readonly _brand: "CommissionRecordId";
};
export type TKasbonId = TId & { readonly _brand: "KasbonId" };
export type TKasbonPaymentId = TId & { readonly _brand: "KasbonPaymentId" };

export const COMMISSION_MODEL = ["percentage", "fixed", "size_tier"] as const;
export type TCommissionModel = (typeof COMMISSION_MODEL)[number];

export type TCommissionRule = {
	readonly id: TCommissionRuleId;
	readonly tenantId: TTenantId;
	readonly staffId: TStaffId;
	readonly model: TCommissionModel;
	readonly ratePercent: number;
	readonly rateFixed: number;
	readonly rateSmall: number;
	readonly rateMedium: number;
	readonly rateLarge: number;
	readonly rateXl: number;
	readonly includeAddons: boolean;
	readonly isActive: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TCommissionRecord = {
	readonly id: TCommissionRecordId;
	readonly tenantId: TTenantId;
	readonly staffId: TStaffId;
	readonly referenceType: "order" | "grooming";
	readonly referenceId: string;
	readonly amount: number;
	readonly status: "pending" | "paid";
	readonly paidAt: Date | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TKasbon = {
	readonly id: TKasbonId;
	readonly tenantId: TTenantId;
	readonly staffId: TStaffId;
	readonly amount: number;
	readonly remaining: number;
	readonly installmentAmount: number;
	readonly notes: string | null;
	readonly status: "active" | "paid_off";
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TKasbonPayment = {
	readonly id: TKasbonPaymentId;
	readonly kasbonId: TKasbonId;
	readonly amount: number;
	readonly source: "manual" | "commission_deduction";
	readonly paidAt: Date;
};
