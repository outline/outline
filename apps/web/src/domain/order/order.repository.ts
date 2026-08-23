import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import type {
	InsufficientStockError,
	InvalidStatusTransitionError,
	OrderAlreadyVoidedError,
	OrderNotFoundError,
} from "./order.errors";
import type { TOrderId, TOrderTracking, TOrderWithItems } from "./order.types";

export type TOrderListFilters = {
	readonly limit?: number;
	readonly offset?: number;
	readonly status?:
		| "draft"
		| "confirmed"
		| "processing"
		| "shipped"
		| "delivered"
		| "cancelled"
		| "voided";
	readonly fromDate?: Date;
	readonly toDate?: Date;
	readonly phone?: string;
};

export type TOrderListResult = {
	readonly orders: readonly TOrderWithItems[];
	readonly total: number;
};

export class IOrderRepository extends Context.Tag("IOrderRepository")<
	IOrderRepository,
	{
		readonly findById: (
			id: TOrderId,
			tenantId: TTenantId,
		) => Effect.Effect<TOrderWithItems | null, DatabaseError>;
		readonly findByCustomerId: (
			customerId: string,
			tenantId: TTenantId,
			options?: { limit?: number; offset?: number },
		) => Effect.Effect<TOrderListResult, DatabaseError>;
		readonly findAll: (
			tenantId: TTenantId,
			options?: TOrderListFilters,
		) => Effect.Effect<TOrderListResult, DatabaseError>;
		readonly findDrafts: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TOrderWithItems[], DatabaseError>;
		/**
		 * Persists an order with strong ACID guarantees:
		 *   1. Insert order row + items + decrement stock + write audit log in
		 *      a single Postgres transaction. Either everything commits or the
		 *      whole thing rolls back.
		 *   2. Variant products decrement `product_variants.stock` (not the
		 *      parent's) using optimistic locking on `version`.
		 *   3. A `stock_movements` row records the deduction for auditability
		 *      and eventual void-time restoration.
		 *   4. Caller is expected to have applied the voucher *before* calling
		 *      this — vouchers mutate `promo_codes.used_count` and write to
		 *      `promo_usage`, which must happen in the same transaction.
		 */
		readonly saveFull: (
			orderWithItems: TOrderWithItems,
		) => Effect.Effect<void, DatabaseError | InsufficientStockError>;
		readonly updateStatus: (
			orderId: TOrderId,
			tenantId: TTenantId,
			status:
				| "draft"
				| "confirmed"
				| "processing"
				| "shipped"
				| "delivered"
				| "cancelled",
			tracking?: TOrderTracking,
			actorId?: TUserId,
		) => Effect.Effect<
			TOrderWithItems,
			DatabaseError | OrderNotFoundError | InvalidStatusTransitionError
		>;
		/**
		 * Voids an order atomically:
		 *   1. Mark orders.voided_at/_by/_reason and set status='voided'.
		 *   2. Restore stock for each item — variant products restore
		 *      product_variants.stock, non-variant restore products.stock.
		 *   3. Append a `stock_movements` row per item so void can be
		 *      traced per pet.
		 *   4. Write an audit_logs entry tagged `void` so the order timeline
		 *      endpoint shows what happened.
		 * Rejects orders that are already voided (`OrderAlreadyVoidedError`)
		 * or missing (`OrderNotFoundError`).
		 */
		readonly voidOrder: (
			orderId: TOrderId,
			tenantId: TTenantId,
			voidedBy: import("@/shared/types/common.types").TUserId,
			reason: string,
		) => Effect.Effect<
			void,
			DatabaseError | OrderNotFoundError | OrderAlreadyVoidedError
		>;
		readonly getProductFrequency: (
			tenantId: TTenantId,
			startDate?: Date,
		) => Effect.Effect<Readonly<Record<string, number>>, DatabaseError>;
	}
>() {}
