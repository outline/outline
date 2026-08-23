import type {
	TBillingEvent,
	TPaymentResult,
	TSubscription,
} from "./billing.types";
import { PLAN_LIMITS } from "./billing.module";

export type TSubscriptionDto = {
	readonly plan: string;
	readonly status: string;
	readonly currentPeriodEnd: string | null;
	readonly limits: (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS];
};

export type TBillingEventDto = {
	readonly id: string;
	readonly eventType: string;
	readonly plan: string;
	readonly amount: number;
	readonly status: string;
	readonly createdAt: string;
	readonly externalOrderId: string | null;
};

export type TPaymentResultDto = TPaymentResult;

export const toSubscriptionDto = (s: TSubscription): TSubscriptionDto => ({
	plan: s.plan,
	status: s.status,
	currentPeriodEnd: s.currentPeriodEnd
		? s.currentPeriodEnd.toISOString()
		: null,
	limits: PLAN_LIMITS[s.plan],
});

export const toBillingEventDto = (e: TBillingEvent): TBillingEventDto => ({
	id: e.id,
	eventType: e.eventType,
	plan: e.plan,
	amount: e.amount,
	status: e.status,
	createdAt: e.createdAt.toISOString(),
	externalOrderId: e.externalOrderId,
});
