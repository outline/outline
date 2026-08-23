import { Context, type Effect } from "effect";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { IPaymentProvider } from "@/shared/ports";
import type { TTenantId } from "@/shared/types/common.types";
import type {
	TBillingEvent,
	TBillingEventId,
	TSubscription,
	TSubscriptionId,
	TUsageMetrics,
} from "./billing.types";

export class IBillingRepository extends Context.Tag("IBillingRepository")<
	IBillingRepository,
	{
		readonly findSubscriptionByTenantId: (
			tenantId: TTenantId,
		) => Effect.Effect<TSubscription | null, DatabaseError>;
		readonly findEventByOrderId: (
			orderId: string,
		) => Effect.Effect<TBillingEvent | null, DatabaseError>;
		readonly saveEvent: (
			event: TBillingEvent,
		) => Effect.Effect<void, DatabaseError>;
		readonly updateEvent: (
			event: TBillingEvent,
		) => Effect.Effect<void, DatabaseError>;
		readonly updateSubscription: (
			subscription: TSubscription,
		) => Effect.Effect<void, DatabaseError>;
		readonly getHistory: (
			tenantId: TTenantId,
		) => Effect.Effect<readonly TBillingEvent[], DatabaseError>;
		readonly getUsageMetrics: (
			tenantId: TTenantId,
		) => Effect.Effect<TUsageMetrics, DatabaseError>;
		/**
		 * Atomically applies a payment-gateway callback: updates the
		 * billing_event row (status, transaction id, metadata) AND
		 * (on success) extends the subscriptions row's plan and
		 * billing period in a single Postgres transaction. Replaces
		 * the previous two-call pattern (updateEvent + updateSubscription)
		 * which was vulnerable to partial-failure inconsistency
		 * (event 'success' but subscription still inactive).
		 */
		readonly atomicApplyPaymentCallback: (
			params: AtomicPaymentCallbackParams,
		) => Effect.Effect<PaymentCallbackResult, DatabaseError>;
	}
>() {}

export type AtomicPaymentCallbackParams = {
	readonly tenantId: TTenantId;
	readonly orderId: string;
	readonly transactionId?: string | null;
	readonly transactionStatus?: string | null;
	readonly paymentMethod?: string | null;
};

export type PaymentCallbackResult = {
	readonly eventId: TBillingEventId;
	readonly subscriptionId: TSubscriptionId | null;
	readonly status: "success" | "pending" | "failed";
};

// Domain-specific alias for the shared Payment Port
export { IPaymentProvider };
