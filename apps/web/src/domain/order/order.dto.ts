import type {
	TOrderDto,
	TOrderItemDto,
	TOrderPaymentDto,
} from "@treonstudio/petso-lib";
import type { TOrderWithItems } from "./order.types";

export type { TOrderDto, TOrderItemDto, TOrderPaymentDto };

export const toOrderDto = (order: TOrderWithItems): TOrderDto => ({
	id: order.id,
	branchId: order.branchId,
	customerId: order.customerId,
	totalAmount: order.totalAmount,
	paymentMethod: order.paymentMethod,
	status: order.status,
	discountType: order.discountType,
	discountValue: order.discountValue,
	discountAmount: order.discountAmount,
	voucherCode: order.voucherCode,
	voucherDiscount: order.voucherDiscount,
	trackingNumber: order.trackingNumber ?? null,
	shippingCarrier: order.shippingCarrier ?? null,
	shippedAt: order.shippedAt?.toISOString() ?? null,
	deliveredAt: order.deliveredAt?.toISOString() ?? null,
	cancelledAt: order.cancelledAt?.toISOString() ?? null,
	cancelledReason: order.cancelledReason ?? null,
	cancelledBy: order.cancelledBy ?? null,
	voidedAt: order.voidedAt ? order.voidedAt.toISOString() : null,
	voidedReason: order.voidedReason,
	voidedBy: order.voidedBy,
	createdBy: order.createdBy,
	createdAt: order.createdAt.toISOString(),
	items: order.items.map((item) => ({
		id: item.id,
		orderId: item.orderId,
		productId: item.productId,
		...(item.variantId !== undefined && { variantId: item.variantId ?? null }),
		...(item.unit !== undefined && { unit: item.unit }),
		productName:
			((item as Record<string, unknown>).productName as string) || "",
		quantity: item.quantity,
		priceAtTime: item.priceAtTime,
		discountType: item.discountType,
		discountValue: item.discountValue,
		discountAmount: item.discountAmount,
	})),
	...(order.payments !== undefined && {
		payments: order.payments.map((p) => ({
			id: p.id,
			orderId: p.orderId,
			method: p.method,
			amount: p.amount,
			createdAt: p.createdAt.toISOString(),
		})),
	}),
});
