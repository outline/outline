import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { getBusinessIdForUser } from "@/domain/identity";
import {
	createOrderProgram,
	getDraftsProgram,
	getOrdersProgram,
	getProductFrequencyProgram,
	updateOrderStatus as updateOrderStatusProgram,
	voidOrderProgram,
} from "@/domain/order/order.programs";
import {
	CreateOrderSchema,
	UpdateOrderStatusCommand,
	VoidOrderSchema,
} from "@/domain/order/order.schemas";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import type { TOrderId, TOrderTracking } from "@/domain/order/order.types";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { DateUtils } from "@/shared/utils";

export const getOrders = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getOrdersProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const getDrafts = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return [];

		const program = getDraftsProgram(businessId as TTenantId);
		return await runApp(program);
	});

export const createOrder = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(CreateOrderSchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "order:write"));

		const program = createOrderProgram(data, tenantId, userId);

		try {
			return await runApp(program);
		} catch (error: unknown) {
			if (error?.toString().includes("InsufficientStockError")) {
				throw new Error(
					"Stok produk tidak mencukupi untuk memenuhi pesanan ini.",
				);
			}
			throw error;
		}
	});

export const voidOrder = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(VoidOrderSchema))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "order:void"));

		const program = voidOrderProgram(data, tenantId, userId);
		await runApp(program);

		return { success: true };
	});

export const getProductFrequency = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { userId } = context;
		const businessId = await getBusinessIdForUser(userId as TUserId);
		if (!businessId) return {};

		const startOfMonth = DateUtils.startOfMonth();
		const program = getProductFrequencyProgram(
			businessId as TTenantId,
			startOfMonth,
		);
		return await runApp(program);
	});

export const updateOrderStatus = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(UpdateOrderStatusCommand))
	.handler(async ({ data, context }) => {
		const { tenantId, userId } = context;
		await runApp(requireCapability(context, "order:write"));

		const tracking: TOrderTracking = {
			...(data.trackingNumber && { trackingNumber: data.trackingNumber }),
			...(data.shippingCarrier && { shippingCarrier: data.shippingCarrier }),
			...(data.cancelledReason && { cancelledReason: data.cancelledReason }),
		};
		const trackingArg =
			data.trackingNumber || data.shippingCarrier || data.cancelledReason
				? tracking
				: undefined;

		await runApp(
			updateOrderStatusProgram(
				data.orderId as TOrderId,
				tenantId,
				data.status,
				trackingArg,
				userId,
			),
		);

		return { success: true };
	});

export const ordersApi = {
	getOrders,
	getDrafts,
	createOrder,
	voidOrder,
	updateOrderStatus,
	getProductFrequency,
};
