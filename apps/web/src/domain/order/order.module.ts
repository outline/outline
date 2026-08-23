import { Effect } from "effect";
import type { TCustomerId } from "@/domain/customer/customer.types";
import type { TProductId } from "@/domain/product/product.types";
import type {
	TBranchId,
	TTenantId,
	TUserId,
} from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { OrderAlreadyVoidedError } from "./order.errors";
import type {
	TOrder,
	TOrderId,
	TOrderItem,
	TOrderItemId,
	TOrderWithItems,
	TPaymentMethod,
} from "./order.types";

export const OrderModule = {
	create: (
		tenantId: TTenantId,
		branchId: TBranchId,
		createdBy: TUserId,
		items: readonly {
			productId: TProductId;
			variantId?: string | null;
			unit?: string;
			quantity: number;
			priceAtTime: number;
			discountType?: "percentage" | "fixed" | null;
			discountValue?: number;
			discountAmount?: number;
		}[],
		options?: {
			customerId?: TCustomerId | null;
			status?: "draft" | "confirmed";
			discountType?: "percentage" | "fixed" | null;
			discountValue?: number;
			discountAmount?: number;
			voucherCode?: string | null;
			voucherDiscount?: number;
			payments?: readonly {
				method: TPaymentMethod;
				amount: number;
			}[];
		},
	): TOrderWithItems => {
		const orderId = generateId<TOrderId>();
		const subtotalAmount = items.reduce(
			(sum, item) =>
				sum + item.quantity * item.priceAtTime - (item.discountAmount || 0),
			0,
		);
		// Voucher discount is *additive* on top of any per-item discount.
		// The caller is expected to have already validated min-order and max
		// uses against this subtotal; we just clamp at zero to avoid going
		// negative if the caller passed a stale larger discount.
		const voucherDiscount = Math.min(
			subtotalAmount,
			Math.max(0, options?.voucherDiscount ?? 0),
		);
		const totalAmount = Math.max(
			0,
			subtotalAmount - voucherDiscount - (options?.discountAmount || 0),
		);

		const order: TOrder = {
			id: orderId,
			tenantId,
			branchId,
			customerId: options?.customerId || null,
			totalAmount,
			paymentMethod: options?.payments?.[0]?.method || "cash", // fallback for deprecated field
			status: options?.status || "confirmed",
			discountType: options?.discountType || null,
			discountValue: options?.discountValue || 0,
			discountAmount: options?.discountAmount || 0,
			voucherCode: options?.voucherCode ?? null,
			voucherDiscount,
			voidedAt: null,
			voidedBy: null,
			voidedReason: null,
			createdBy,
			createdAt: new Date(),
		};

		const orderItems: readonly TOrderItem[] = items.map((item) => ({
			id: generateId<TOrderItemId>(),
			orderId,
			productId: item.productId,
			...(item.variantId !== undefined && {
				variantId: item.variantId ?? null,
			}),
			...(item.unit !== undefined && { unit: item.unit }),
			quantity: item.quantity,
			priceAtTime: item.priceAtTime,
			discountType: item.discountType || null,
			discountValue: item.discountValue || 0,
			discountAmount: item.discountAmount || 0,
		}));

		const payments = options?.payments?.map((p) => ({
			id: generateId<import("./order.types").TOrderPaymentId>(),
			orderId,
			method: p.method,
			amount: p.amount,
			createdAt: new Date(),
		}));

		return { ...order, items: orderItems, ...(payments && { payments }) };
	},

	void: (
		order: TOrder,
		voidedBy: TUserId,
		reason: string,
	): Effect.Effect<TOrder, OrderAlreadyVoidedError> =>
		order.voidedAt || order.status === "voided"
			? Effect.fail(new OrderAlreadyVoidedError({ id: order.id }))
			: Effect.succeed({
					...order,
					status: "voided",
					voidedAt: new Date(),
					voidedBy,
					voidedReason: reason,
				}),

	reconstitute: (raw: TOrderWithItems): TOrderWithItems => ({ ...raw }),
} as const;
