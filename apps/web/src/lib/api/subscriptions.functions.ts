import { createServerFn } from "@tanstack/react-start";
import {
	getCurrentSubscriptionProgram,
	getUsageMetricsProgram,
} from "@/domain/billing";
import { getBusinessIdForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getSubscription = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Profil tidak ditemukan");

		return await runApp(getCurrentSubscriptionProgram(businessId as TTenantId));
	});

export const getUsageMetrics = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Profil tidak ditemukan");

		return await runApp(getUsageMetricsProgram(businessId as TTenantId));
	});

export const subscriptionsApi = {
	getSubscription,
	getUsageMetrics,
};
