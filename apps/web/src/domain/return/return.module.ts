import { Effect } from "effect";
import type { TOrderId, TOrderItemId } from "@/domain/order/order.types";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import type { TCreateReturnInput } from "./return.schemas";
import type {
	TReturn,
	TReturnId,
	TReturnItem,
	TReturnItemId,
	TReturnWithItems,
} from "./return.types";

export const createReturnEntity = (
	input: TCreateReturnInput,
	tenantId: TTenantId,
	userId: TUserId,
): Effect.Effect<TReturnWithItems> =>
	Effect.sync(() => {
		const returnId = generateId<TReturnId>();

		const returnItems: TReturnItem[] = input.items.map((item) => ({
			id: generateId<TReturnItemId>(),
			returnId,
			orderItemId: item.orderItemId as TOrderItemId,
			qty: item.qty,
			reason: item.reason ?? null,
			isDamaged: item.isDamaged,
		}));

		const returnOrder: TReturn = {
			id: returnId,
			tenantId,
			orderId: input.orderId as TOrderId,
			status: "completed",
			refundMethod: input.refundMethod ?? null,
			refundAmount: input.refundAmount,
			reason: input.reason ?? null,
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		return { ...returnOrder, items: returnItems };
	});
