import type { TOrderId, TOrderItemId } from "@/domain/order/order.types";
import type { TId, TTenantId, TUserId } from "@/shared/types/common.types";

export type TReturnId = TId & { readonly _brand: "ReturnId" };
export type TReturnItemId = TId & { readonly _brand: "ReturnItemId" };

export const RETURN_STATUS = ["completed"] as const;
export type TReturnStatus = (typeof RETURN_STATUS)[number];

export type TReturn = {
	readonly id: TReturnId;
	readonly tenantId: TTenantId;
	readonly orderId: TOrderId;
	readonly status: TReturnStatus;
	readonly refundMethod: string | null;
	readonly refundAmount: number;
	readonly reason: string | null;
	readonly createdBy: TUserId;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TReturnItem = {
	readonly id: TReturnItemId;
	readonly returnId: TReturnId;
	readonly orderItemId: TOrderItemId;
	readonly qty: number;
	readonly reason: string | null;
	readonly isDamaged: boolean;
};

export type TReturnWithItems = TReturn & {
	readonly items: readonly TReturnItem[];
};
