import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import {
	CreatePaymentSchema,
	createSubscriptionPaymentProgram,
	getBillingHistoryProgram,
	getCurrentSubscriptionProgram,
	handlePaymentCallbackProgram,
	PaymentCallbackSchema,
} from "@/domain/billing";
import { getBusinessIdForUser, getProfileForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const createSubscriptionPayment = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreatePaymentSchema))
	.handler(async ({ data, context }) => {
		const { userId, tenantId } = context;
		await runApp(requireCapability(context, "billing:write"));

		const profile = await getProfileForUser(userId as TUserId);
		if (!profile) throw new Error("Profil tidak ditemukan.");

		const program = createSubscriptionPaymentProgram(
			data,
			tenantId,
			userId as TUserId,
			{ name: profile.fullName || "User", email: profile.email || "" },
		);
		return await runApp(program);
	});

export const handlePaymentCallback = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(PaymentCallbackSchema))
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);

		if (!businessId) throw new Error("Profil bisnis tidak ditemukan.");

		const program = handlePaymentCallbackProgram(data, businessId as TTenantId);
		return await runApp(program);
	});

export const getBillingHistory = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getBillingHistoryProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const getCurrentSubscription = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return null;

		const program = getCurrentSubscriptionProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const paymentsApi = {
	createSubscriptionPayment,
	handlePaymentCallback,
	getBillingHistory,
	getCurrentSubscription,
};
