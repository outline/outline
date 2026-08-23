import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TPurchaseOrder,
	TPurchaseOrderId,
	TPurchaseOrderWithItems,
} from "./purchase-order.types";

export class IPurchaseOrderRepository extends Context.Tag(
	"IPurchaseOrderRepository",
)<
	IPurchaseOrderRepository,
	{
		readonly findAll: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TPurchaseOrder[], DatabaseError>;

		readonly findById: (
			id: TPurchaseOrderId,
			tenantId: TTenantId,
		) => Effect.Effect<TPurchaseOrderWithItems | null, DatabaseError>;

		readonly saveOrderWithItems: (
			order: TPurchaseOrderWithItems,
		) => Effect.Effect<void, DatabaseError>;

		readonly updateOrderStatus: (
			id: TPurchaseOrderId,
			tenantId: TTenantId,
			status: string,
		) => Effect.Effect<void, DatabaseError>;

		readonly receivePurchaseOrder: (
			params: {
				readonly receivingId: string;
				readonly poId: string;
				readonly notes: string | null;
				readonly receivedDate: Date;
				readonly receivedBy: string;
				readonly items: ReadonlyArray<{
					readonly id: string;
					readonly poItemId: string;
					readonly qtyReceived: number;
					readonly expiryDate: Date | null;
					readonly batchNumber: string | null;
					readonly variantId: string;
					readonly unitCost: number;
				}>;
			},
			tenantId: TTenantId,
		) => Effect.Effect<
			{ readonly receivingId: string; readonly newStatus: string },
			DatabaseError
		>;
	}
>() {}
