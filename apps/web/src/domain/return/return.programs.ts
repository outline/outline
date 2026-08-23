import { Effect } from "effect";
import type { TOrderId } from "@/domain/order";
import { IOrderRepository, OrderNotFoundError } from "@/domain/order";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { InvalidReturnQuantityError } from "./return.errors";
import { createReturnEntity } from "./return.module";
import { IReturnRepository } from "./return.repository";
import type { TCreateReturnInput } from "./return.schemas";

export const getReturnsProgram = (tenantId: TTenantId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(IReturnRepository);
		return yield* _(repo.findAll(tenantId));
	});

export const processReturnProgram = (
	input: TCreateReturnInput,
	tenantId: TTenantId,
	userId: TUserId,
) =>
	Effect.gen(function* (_) {
		const returnRepo = yield* _(IReturnRepository);
		const orderRepo = yield* _(IOrderRepository);

		const orderId = input.orderId as TOrderId;
		const order = yield* _(orderRepo.findById(orderId, tenantId));

		if (!order) {
			return yield* _(Effect.fail(new OrderNotFoundError({ id: orderId })));
		}

		// Validate return quantities
		for (const returnItem of input.items) {
			const originalOrderItem = order.items.find(
				(i) => i.id === returnItem.orderItemId,
			);

			if (originalOrderItem && returnItem.qty > originalOrderItem.quantity) {
				return yield* _(
					Effect.fail(
						new InvalidReturnQuantityError({
							orderItemId: returnItem.orderItemId,
							qtyOrdered: originalOrderItem.quantity,
							qtyReturned: returnItem.qty,
						}),
					),
				);
			}
		}

		// Create Return Entity
		const returnWithItems = yield* _(
			createReturnEntity(input, tenantId, userId),
		);

		// Single atomic RPC call: insert return + items + restore stock + audit
		return yield* _(returnRepo.processReturn(returnWithItems));
	});
