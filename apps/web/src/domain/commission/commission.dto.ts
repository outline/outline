import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TCommissionModel,
	TCommissionRecord,
	TCommissionRecordId,
	TCommissionRule,
	TCommissionRuleId,
	TKasbon,
	TKasbonId,
	TKasbonPayment,
	TKasbonPaymentId,
} from "./commission.types";

export type TCommissionRuleDto = {
	readonly id: string;
	readonly business_id: string;
	readonly staff_id: string;
	readonly model: string;
	readonly rate_percent: number;
	readonly rate_fixed: number;
	readonly rate_small: number;
	readonly rate_medium: number;
	readonly rate_large: number;
	readonly rate_xl: number;
	readonly include_addons: boolean;
	readonly is_active: boolean;
	readonly created_at: string;
	readonly updated_at: string;
};

export const toCommissionRule = (dto: TCommissionRuleDto): TCommissionRule => ({
	id: dto.id as TCommissionRuleId,
	tenantId: dto.business_id as TTenantId,
	staffId: dto.staff_id as TStaffId,
	model: dto.model as TCommissionModel,
	ratePercent: dto.rate_percent,
	rateFixed: dto.rate_fixed,
	rateSmall: dto.rate_small,
	rateMedium: dto.rate_medium,
	rateLarge: dto.rate_large,
	rateXl: dto.rate_xl,
	includeAddons: dto.include_addons,
	isActive: dto.is_active,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});

export type TCommissionRecordDto = {
	readonly id: string;
	readonly business_id: string;
	readonly staff_id: string;
	readonly reference_type: string;
	readonly reference_id: string;
	readonly amount: number;
	readonly status: string;
	readonly paid_at: string | null;
	readonly created_at: string;
	readonly updated_at: string;
};

export const toCommissionRecord = (
	dto: TCommissionRecordDto,
): TCommissionRecord => ({
	id: dto.id as TCommissionRecordId,
	tenantId: dto.business_id as TTenantId,
	staffId: dto.staff_id as TStaffId,
	referenceType: dto.reference_type as "order" | "grooming",
	referenceId: dto.reference_id,
	amount: dto.amount,
	status: dto.status as "pending" | "paid",
	paidAt: dto.paid_at ? new Date(dto.paid_at) : null,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});

export type TKasbonDto = {
	readonly id: string;
	readonly business_id: string;
	readonly staff_id: string;
	readonly amount: number;
	readonly remaining: number;
	readonly installment_amount: number;
	readonly notes: string | null;
	readonly status: string;
	readonly created_at: string;
	readonly updated_at: string;
};

export const toKasbon = (dto: TKasbonDto): TKasbon => ({
	id: dto.id as TKasbonId,
	tenantId: dto.business_id as TTenantId,
	staffId: dto.staff_id as TStaffId,
	amount: dto.amount,
	remaining: dto.remaining,
	installmentAmount: dto.installment_amount,
	notes: dto.notes,
	status: dto.status as "active" | "paid_off",
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});

export type TKasbonPaymentDto = {
	readonly id: string;
	readonly kasbon_id: string;
	readonly amount: number;
	readonly source: string;
	readonly paid_at: string;
};

export const toKasbonPayment = (dto: TKasbonPaymentDto): TKasbonPayment => ({
	id: dto.id as TKasbonPaymentId,
	kasbonId: dto.kasbon_id as TKasbonId,
	amount: dto.amount,
	source: dto.source as "manual" | "commission_deduction",
	paidAt: new Date(dto.paid_at),
});
