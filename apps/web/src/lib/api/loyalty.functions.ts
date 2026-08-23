import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	applyPromoCodeProgram,
	createPromoCodeProgram,
	earnPointsProgram,
	evaluateTierProgram,
	getActivePromoCodesProgram,
	getLoyaltyConfigProgram,
	getPromoCodesProgram,
	redeemPointsProgram,
	updateLoyaltyConfigProgram,
	validatePromoCodeProgram,
} from "@/domain/loyalty";
import {
	autoEarnCashbackProgram,
	getCashbackPreviewProgram,
	redeemCashbackProgram,
} from "@/domain/loyalty/cashback.programs";
import {
	ApplyPromoCodeSchema,
	AutoEarnCashbackSchema,
	CashbackPreviewSchema,
	CreatePromoCodeSchema,
	EarnPointsSchema,
	RedeemCashbackSchema,
	RedeemPointsSchema,
	UpdateLoyaltyConfigSchema,
	ValidatePromoCodeSchema,
} from "@/domain/loyalty/loyalty.schemas";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getLoyaltyConfig = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;

		const program = getLoyaltyConfigProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const updateLoyaltyConfig = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateLoyaltyConfigSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "loyalty:write"));

		const program = updateLoyaltyConfigProgram(data, tenantId);
		await runApp(program);

		return { success: true };
	});

export const earnPoints = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(EarnPointsSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "loyalty:write"));

		const program = earnPointsProgram(data, tenantId);
		return await runApp(program);
	});

export const redeemPoints = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(RedeemPointsSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "loyalty:write"));

		const program = redeemPointsProgram(data, tenantId);
		return await runApp(program);
	});

export const evaluateTier = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator((customerId: string) => customerId)
	.handler(async ({ data: customerId, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "loyalty:write"));

		const program = evaluateTierProgram(customerId, tenantId);
		return await runApp(program);
	});

export const getPromoCodes = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getPromoCodesProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const getActivePromoCodes = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getActivePromoCodesProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const createPromoCode = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreatePromoCodeSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "loyalty:write"));

		const program = createPromoCodeProgram(data, tenantId);
		return await runApp(program);
	});

export const validatePromoCode = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ValidatePromoCodeSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		const program = validatePromoCodeProgram(data, tenantId);
		return await runApp(program);
	});

export const applyPromoCode = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ApplyPromoCodeSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "loyalty:write"));

		const program = applyPromoCodeProgram(data, tenantId);
		return await runApp(program);
	});

export const getCashbackPreview = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CashbackPreviewSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		const program = getCashbackPreviewProgram(
			data.customerId,
			data.amount,
			tenantId,
		);
		return await runApp(program);
	});

export const autoEarnCashback = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(AutoEarnCashbackSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "loyalty:write"));

		const program = autoEarnCashbackProgram(
			data.customerId,
			data.orderId,
			data.amount,
			tenantId,
		);
		return await runApp(program);
	});

export const redeemCashback = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(RedeemCashbackSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "loyalty:write"));

		const program = redeemCashbackProgram(
			data.customerId,
			data.points,
			data.orderId ?? null,
			tenantId,
		);
		return await runApp(program);
	});

export const loyaltyApi = {
	getLoyaltyConfig,
	updateLoyaltyConfig,
	earnPoints,
	redeemPoints,
	evaluateTier,
	getPromoCodes,
	getActivePromoCodes,
	createPromoCode,
	validatePromoCode,
	applyPromoCode,
	getCashbackPreview,
	autoEarnCashback,
	redeemCashback,
};
