import { Effect } from "effect";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import {
	InvalidPoStatusError,
	OverReceiveError,
	PurchaseOrderNotFoundError,
} from "./purchase-order.errors";
import {
	createPurchaseOrderEntity,
	createReceivingEntity,
} from "./purchase-order.module";
import { IPurchaseOrderRepository } from "./purchase-order.repository";
import type {
	TCreatePurchaseOrderInput,
	TReceivePurchaseOrderInput,
} from "./purchase-order.schemas";
import type { TPurchaseOrderId } from "./purchase-order.types";

export const getPurchaseOrdersProgram = (tenantId: TTenantId) =>
	Effect.gen(function* (_) {
		const repo = yield* _(IPurchaseOrderRepository);
		return yield* _(repo.findAll(tenantId));
	});

export const getPurchaseOrderByIdProgram = (
	id: TPurchaseOrderId,
	tenantId: TTenantId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(IPurchaseOrderRepository);
		const po = yield* _(repo.findById(id, tenantId));
		if (!po) {
			yield* _(Effect.fail(new PurchaseOrderNotFoundError({ id })));
		}
		return po;
	});

export const createPurchaseOrderProgram = (
	input: TCreatePurchaseOrderInput,
	tenantId: TTenantId,
	userId: TUserId,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(IPurchaseOrderRepository);
		const orderWithItems = yield* _(
			createPurchaseOrderEntity(input, tenantId, userId),
		);
		yield* _(repo.saveOrderWithItems(orderWithItems));
		return orderWithItems;
	});

export const updatePoStatusProgram = (
	id: TPurchaseOrderId,
	tenantId: TTenantId,
	status: string,
) =>
	Effect.gen(function* (_) {
		const repo = yield* _(IPurchaseOrderRepository);
		const po = yield* _(repo.findById(id, tenantId));

		if (!po) {
			return yield* _(Effect.fail(new PurchaseOrderNotFoundError({ id })));
		}

		if (po.status === "received" || po.status === "cancelled") {
			return yield* _(
				Effect.fail(
					new InvalidPoStatusError({
						currentStatus: po.status,
						attemptedAction: `update to ${status}`,
					}),
				),
			);
		}

		yield* _(repo.updateOrderStatus(id, tenantId, status));
	});

export const receivePurchaseOrderProgram = (
	input: TReceivePurchaseOrderInput,
	tenantId: TTenantId,
	userId: TUserId,
) =>
	Effect.gen(function* (_) {
		const poRepo = yield* _(IPurchaseOrderRepository);

		const poId = input.poId as TPurchaseOrderId;
		const po = yield* _(poRepo.findById(poId, tenantId));

		if (!po) {
			return yield* _(
				Effect.fail(new PurchaseOrderNotFoundError({ id: poId })),
			);
		}

		if (po.status === "received" || po.status === "cancelled") {
			return yield* _(
				Effect.fail(
					new InvalidPoStatusError({
						currentStatus: po.status,
						attemptedAction: "receive items",
					}),
				),
			);
		}

		// Validate receiving quantities against ordered quantities
		for (const recvItem of input.items) {
			const poItem = po.items.find((i) => i.id === recvItem.poItemId);
			if (!poItem) continue;

			const newTotalReceived = poItem.qtyReceived + recvItem.qtyReceived;
			if (newTotalReceived > poItem.qtyOrdered) {
				return yield* _(
					Effect.fail(
						new OverReceiveError({
							poItemId: poItem.id,
							qtyOrdered: poItem.qtyOrdered,
							currentReceived: poItem.qtyReceived,
							attemptedReceive: recvItem.qtyReceived,
						}),
					),
				);
			}
		}

		// Generate receiving entity IDs
		const { receiving, items } = yield* _(
			createReceivingEntity(poId, input, userId),
		);

		// Build RPC params: merge receiving items with PO item data
		const rpcItems = items.map((item) => {
			const poItem = po.items.find((pi) => pi.id === item.poItemId);
			return {
				id: item.id,
				poItemId: item.poItemId,
				qtyReceived: item.qtyReceived,
				expiryDate: item.expiryDate,
				batchNumber: item.batchNumber,
				variantId: poItem?.variantId ?? "",
				unitCost: poItem?.unitCost ?? 0,
			};
		});

		// Single atomic call: creates receiving, updates items, creates batches + movements
		return yield* _(
			poRepo.receivePurchaseOrder(
				{
					receivingId: receiving.id,
					poId: po.id,
					notes: receiving.notes,
					receivedDate: receiving.receivedDate,
					receivedBy: receiving.receivedBy,
					items: rpcItems,
				},
				tenantId,
			),
		);
	});
