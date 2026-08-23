import type { TOrderId, TOrderItemId } from "@/domain/order/order.types";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import type {
	TReturn,
	TReturnId,
	TReturnItem,
	TReturnItemId,
	TReturnStatus,
} from "./return.types";

export type TReturnDto = {
	readonly id: string;
	readonly business_id: string;
	readonly order_id: string;
	readonly status: string;
	readonly refund_method: string | null;
	readonly refund_amount: number;
	readonly reason: string | null;
	readonly created_by: string;
	readonly created_at: string;
	readonly updated_at: string;
};

export type TReturnItemDto = {
	readonly id: string;
	readonly return_id: string;
	readonly order_item_id: string;
	readonly qty: number;
	readonly reason: string | null;
	readonly is_damaged: boolean;
};

export const toReturnDomain = (dto: TReturnDto): TReturn => ({
	id: dto.id as TReturnId,
	tenantId: dto.business_id as TTenantId,
	orderId: dto.order_id as TOrderId,
	status: dto.status as TReturnStatus,
	refundMethod: dto.refund_method,
	refundAmount: Number(dto.refund_amount),
	reason: dto.reason,
	createdBy: dto.created_by as TUserId,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});

export const toReturnItemDomain = (dto: TReturnItemDto): TReturnItem => ({
	id: dto.id as TReturnItemId,
	returnId: dto.return_id as TReturnId,
	orderItemId: dto.order_item_id as TOrderItemId,
	qty: Number(dto.qty),
	reason: dto.reason,
	isDamaged: dto.is_damaged,
});
