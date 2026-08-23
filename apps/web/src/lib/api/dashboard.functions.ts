import { createServerFn } from "@tanstack/react-start";
import {
	getInventoryItemsProgram,
	getTopSellersProgram,
} from "@/domain/dashboard";
import { getBusinessIdForUser } from "@/domain/identity";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getTopSellers = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];
		return await runApp(getTopSellersProgram(businessId as TTenantId));
	});

export const getInventoryItems = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return { items: [], totalCount: 0 };
		return await runApp(getInventoryItemsProgram(businessId as TTenantId));
	});
