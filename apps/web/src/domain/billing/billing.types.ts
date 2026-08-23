import type { TId, TTenantId } from "@/shared/types/common.types";

export type TBillingEventId = TId & { readonly _brand: "BillingEventId" };
export type TSubscriptionId = TId & { readonly _brand: "SubscriptionId" };

export const SUBSCRIPTION_PLAN = {
	FREE: "free",
	PRO: "pro",
	BUSINESS: "business",
} as const;
export type TSubscriptionPlan =
	(typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];

export const BILLING_CYCLE = {
	MONTHLY: "monthly",
	YEARLY: "yearly",
} as const;
export type TBillingCycle = (typeof BILLING_CYCLE)[keyof typeof BILLING_CYCLE];

export type TSubscription = {
	readonly id: TSubscriptionId;
	readonly tenantId: TTenantId;
	readonly plan: TSubscriptionPlan;
	readonly status: "active" | "past_due" | "cancelled" | "trialing";
	readonly currentPeriodStart: Date;
	readonly currentPeriodEnd: Date | null;
	readonly createdAt: Date;
	readonly updatedAt: Date;
};

export type TBillingEvent = {
	readonly id: TBillingEventId;
	readonly tenantId: TTenantId;
	readonly eventType: string;
	readonly plan: TSubscriptionPlan;
	readonly amount: number;
	readonly currency: string;
	readonly externalOrderId: string | null;
	readonly externalTransactionId: string | null;
	readonly status: "pending" | "success" | "failed";
	readonly metadata: Record<string, unknown>;
	readonly createdAt: Date;
};

export type TUsageMetrics = {
	readonly products: number;
	readonly branches: number;
	readonly staff: number;
	readonly activeBoardings: number;
	readonly transactionsMonth: number;
};

export type TPaymentResult = {
	readonly orderId: string;
	readonly snapToken: string;
	readonly redirectUrl: string;
};
