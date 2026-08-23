import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TProductId } from "@/domain/product/product.types";
import type {
	TBranchId,
	TId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";

export type TOrderId = TId & { readonly _brand: "OrderId" };
export type TOrderItemId = TId & { readonly _brand: "OrderItemId" };

export const PAYMENT_METHOD = {
	CASH: "cash",
	TRANSFER: "transfer",
	QRIS: "qris",
} as const;
export type TPaymentMethod =
	(typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const ORDER_STATUS = [
	"draft",
	"confirmed",
	"processing",
	"shipped",
	"delivered",
	"cancelled",
	"voided",
] as const;
export type TOrderStatus = (typeof ORDER_STATUS)[number];

export type TOrderTracking = {
	readonly trackingNumber?: string | null;
	readonly shippingCarrier?: string | null;
	readonly shippedAt?: Date | null;
	readonly deliveredAt?: Date | null;
	readonly cancelledAt?: Date | null;
	readonly cancelledReason?: string | null;
	readonly cancelledBy?: TUserId | null;
};

export const STATUS_TRANSITIONS: Record<TOrderStatus, TOrderStatus[]> = {
	draft: ["confirmed", "cancelled"],
	confirmed: ["processing", "cancelled"],
	processing: ["shipped", "cancelled"],
	shipped: ["delivered"],
	delivered: [],
	cancelled: [],
	voided: [],
};

export const STATUS_LABELS: Record<TOrderStatus, string> = {
	draft: "Draft",
	confirmed: "Dikonfirmasi",
	processing: "Diproses",
	shipped: "Dikirim",
	delivered: "Diterima",
	cancelled: "Dibatalkan",
	voided: "Void",
};

export function isValidTransition(
	current: TOrderStatus,
	target: TOrderStatus,
): boolean {
	const allowed = STATUS_TRANSITIONS[current];
	return allowed ? allowed.includes(target) : false;
}

export const DISCOUNT_TYPE = ["percentage", "fixed"] as const;
export type TDiscountType = (typeof DISCOUNT_TYPE)[number];

export type TOrderPaymentId = TId & { readonly _brand: "OrderPaymentId" };

export type TOrderPayment = {
	readonly id: TOrderPaymentId;
	readonly orderId: TOrderId;
	readonly method: TPaymentMethod;
	readonly amount: number;
	readonly createdAt: Date;
};

export type TOrder = {
	readonly id: TOrderId;
	readonly tenantId: TTenantId;
	readonly branchId: TBranchId;
	readonly customerId: TCustomerId | null;
	readonly totalAmount: number;
	readonly paymentMethod: TPaymentMethod; // @deprecated, kept for backward compatibility, use payments instead
	readonly status: TOrderStatus;
	readonly discountType: TDiscountType | null;
	readonly discountValue: number;
	readonly discountAmount: number;
	readonly voucherCode: string | null;
	readonly voucherDiscount: number;
	readonly voidedAt: Date | null;
	readonly voidedBy: TUserId | null;
	readonly voidedReason: string | null;
	readonly createdBy: TUserId;
	readonly createdAt: Date;
} & TOrderTracking;

export type TOrderItem = {
	readonly id: TOrderItemId;
	readonly orderId: TOrderId;
	readonly productId: TProductId;
	readonly variantId?: string | null;
	readonly unit?: string;
	readonly quantity: number;
	readonly priceAtTime: number;
	readonly discountType: TDiscountType | null;
	readonly discountValue: number;
	readonly discountAmount: number;
};

export type TOrderWithItems = TOrder & {
	readonly items: readonly TOrderItem[];
	readonly payments?: readonly TOrderPayment[];
};
