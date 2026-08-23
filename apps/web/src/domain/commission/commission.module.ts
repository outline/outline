import { Effect } from "effect";
import type { TStaffId } from "@/domain/staff/staff.types";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	CreateCommissionRuleSchema,
	CreateKasbonSchema,
	PayKasbonSchema,
	UpdateCommissionRuleSchema,
} from "./commission.schemas";
import type {
	TCommissionRule,
	TKasbon,
	TKasbonId,
	TKasbonPayment,
} from "./commission.types";

export const createCommissionRule = (
	tenantId: TTenantId,
	data: typeof CreateCommissionRuleSchema.Type,
) =>
	Effect.sync(() => {
		const rule: Omit<TCommissionRule, "id" | "createdAt" | "updatedAt"> = {
			tenantId,
			staffId: data.staffId as TStaffId,
			model: data.model,
			ratePercent: data.ratePercent,
			rateFixed: data.rateFixed,
			rateSmall: data.rateSmall,
			rateMedium: data.rateMedium,
			rateLarge: data.rateLarge,
			rateXl: data.rateXl,
			includeAddons: data.includeAddons,
			isActive: true,
		};
		return rule;
	});

export const updateCommissionRuleData = (
	data: typeof UpdateCommissionRuleSchema.Type,
) =>
	Effect.sync(() => {
		const updates: Record<string, unknown> = {};

		if (data.model !== undefined) updates.model = data.model;
		if (data.ratePercent !== undefined) updates.ratePercent = data.ratePercent;
		if (data.rateFixed !== undefined) updates.rateFixed = data.rateFixed;
		if (data.rateSmall !== undefined) updates.rateSmall = data.rateSmall;
		if (data.rateMedium !== undefined) updates.rateMedium = data.rateMedium;
		if (data.rateLarge !== undefined) updates.rateLarge = data.rateLarge;
		if (data.rateXl !== undefined) updates.rateXl = data.rateXl;
		if (data.includeAddons !== undefined)
			updates.includeAddons = data.includeAddons;
		if (data.isActive !== undefined) updates.isActive = data.isActive;

		return updates as Partial<
			Omit<TCommissionRule, "id" | "tenantId" | "createdAt" | "updatedAt">
		>;
	});

export const createKasbon = (
	tenantId: TTenantId,
	data: typeof CreateKasbonSchema.Type,
) =>
	Effect.sync(() => {
		const kasbon: Omit<
			TKasbon,
			"id" | "createdAt" | "updatedAt" | "status" | "remaining"
		> = {
			tenantId,
			staffId: data.staffId as TStaffId,
			amount: data.amount,
			installmentAmount: data.installmentAmount,
			notes: data.notes,
		};
		return kasbon;
	});

export const createKasbonPayment = (data: typeof PayKasbonSchema.Type) =>
	Effect.sync(() => {
		const payment: Omit<TKasbonPayment, "id" | "paidAt"> = {
			kasbonId: data.kasbonId as TKasbonId,
			amount: data.amount,
			source: data.source,
		};
		return payment;
	});
