export type TOrderItemDto = {
	readonly id: string;
	readonly orderId: string;
	readonly productId: string;
	readonly variantId?: string | null;
	readonly unit?: string;
	readonly productName?: string;
	readonly quantity: number;
	readonly priceAtTime: number;
	readonly discountType: string | null;
	readonly discountValue: number;
	readonly discountAmount: number;
};

export type TOrderPaymentDto = {
	readonly id: string;
	readonly orderId: string;
	readonly method: string;
	readonly amount: number;
	readonly createdAt: string;
};

export type TOrderDto = {
	readonly id: string;
	readonly branchId: string;
	readonly customerId: string | null;
	readonly totalAmount: number;
	readonly paymentMethod: string;
	readonly status: string;
	readonly discountType: string | null;
	readonly discountValue: number;
	readonly discountAmount: number;
	readonly voucherCode: string | null;
	readonly voucherDiscount: number;
	readonly voidedAt: string | null;
	readonly voidedReason: string | null;
	readonly voidedBy: string | null;
	readonly trackingNumber?: string | null;
	readonly shippingCarrier?: string | null;
	readonly shippedAt?: string | null;
	readonly deliveredAt?: string | null;
	readonly cancelledAt?: string | null;
	readonly cancelledReason?: string | null;
	readonly cancelledBy?: string | null;
	readonly createdBy: string;
	readonly createdAt: string;
	readonly items: readonly TOrderItemDto[];
	readonly payments?: readonly TOrderPaymentDto[];
};

export type TOrderListItemDto = {
	readonly id: string;
	readonly orderNumber?: string;
	readonly totalAmount: number;
	readonly paymentMethod: string;
	readonly status: string;
	readonly createdAt: string;
	readonly itemCount?: number;
};

export type TOrderListResult = {
	readonly orders: readonly TOrderDto[];
	readonly total: number;
};

export type TOrderListParams = {
	readonly search?: string;
	readonly status?: string;
	readonly fromDate?: string;
	readonly toDate?: string;
	readonly limit?: number;
	readonly offset?: number;
};

export type TCreateOrderItemInput = {
	readonly productId: string;
	readonly variantId?: string | null;
	readonly unit?: string;
	readonly quantity: number;
	readonly priceAtTime: number;
	readonly discountType?: string | null;
	readonly discountValue?: number;
	readonly discountAmount?: number;
};

export type TCreateOrderPaymentInput = {
	readonly method: "cash" | "transfer" | "qris";
	readonly amount: number;
};

export type TCreateOrderInput = {
	readonly branchId: string;
	readonly customerId?: string | null;
	readonly status?: "draft" | "completed";
	readonly discountType?: string | null;
	readonly discountValue?: number;
	readonly discountAmount?: number;
	readonly voucherCode?: string | null;
	readonly voucherDiscount?: number;
	readonly items: readonly TCreateOrderItemInput[];
	readonly payments?: readonly TCreateOrderPaymentInput[];
};

export type TUpdateStatusInput = {
	readonly status:
		| "draft"
		| "confirmed"
		| "processing"
		| "shipped"
		| "delivered"
		| "cancelled";
	readonly trackingNumber?: string;
	readonly shippingCarrier?: string;
	readonly cancelledReason?: string;
};

export type TMarkOrderPaidResult = { readonly paid: boolean };

export type TOrderTimelineEntry = {
	readonly id: string;
	readonly action: string;
	readonly description: string;
	readonly performedBy: string;
	readonly createdAt: string;
};
