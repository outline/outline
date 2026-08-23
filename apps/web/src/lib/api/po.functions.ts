import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	createPurchaseOrderProgram,
	getPurchaseOrderByIdProgram,
	getPurchaseOrdersProgram,
	receivePurchaseOrderProgram,
	updatePoStatusProgram,
} from "@/domain/purchase-order/purchase-order.programs";
import {
	CreatePurchaseOrderSchema,
	ReceivePurchaseOrderSchema,
} from "@/domain/purchase-order/purchase-order.schemas";
import type { TPurchaseOrderId } from "@/domain/purchase-order/purchase-order.types";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TTenantId, TUserId } from "@/shared/types/common.types";

export const getPurchaseOrders = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getPurchaseOrdersProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const getPurchaseOrderById = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.validator((id: string) => id)
	.handler(async ({ data, context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) throw new Error("Unauthorized");

		const program = getPurchaseOrderByIdProgram(
			data as TPurchaseOrderId,
			businessId as TTenantId,
		);
		return await runApp(program);
	});

export const createPurchaseOrder = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreatePurchaseOrderSchema))
	.handler(async ({ data, context }) => {
		const { userId, tenantId } = context;
		await runApp(requireCapability(context, "po:write"));

		const program = createPurchaseOrderProgram(data, tenantId, userId);
		return await runApp(program);
	});

export const updatePoStatus = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(
		Schema.decodeUnknownSync(
			Schema.Struct({ id: Schema.String, status: Schema.String }),
		),
	)
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "po:write"));

		const program = updatePoStatusProgram(
			data.id as TPurchaseOrderId,
			tenantId,
			data.status,
		);
		return await runApp(program);
	});

export const receivePurchaseOrder = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(ReceivePurchaseOrderSchema))
	.handler(async ({ data, context }) => {
		const { userId, tenantId } = context;
		await runApp(requireCapability(context, "po:write"));

		const program = receivePurchaseOrderProgram(data, tenantId, userId);
		return await runApp(program);
	});
