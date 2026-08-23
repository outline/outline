import type {
	TBillingCycle,
	TSubscription,
	TSubscriptionPlan,
	TPlanLimits,
} from "./billing.types";

export const PLAN_LIMITS: Record<TSubscriptionPlan, TPlanLimits> = {
	free: { staff: 3, branches: 1, boardingsPerMonth: 30 },
	pro: { staff: 10, branches: 3, boardingsPerMonth: 200 },
	business: { staff: 50, branches: 20, boardingsPerMonth: 2000 },
};

export const BillingModule = {
	calculateAmount: (plan: TSubscriptionPlan, cycle: TBillingCycle): number => {
		// In a real app, these would come from constants or a pricing service
		const pricing = {
			pro: { monthly: 199000, yearly: 1990000 },
			business: { monthly: 449000, yearly: 4490000 },
		};
		if (plan === "free") return 0;
		return pricing[plan][cycle];
	},

	calculateNextPeriodEnd: (start: Date, cycle: TBillingCycle): Date => {
		const end = new Date(start);
		if (cycle === "yearly") {
			end.setFullYear(end.getFullYear() + 1);
		} else {
			end.setMonth(end.getMonth() + 1);
		}
		return end;
	},

	reconstituteSubscription: (raw: TSubscription): TSubscription => ({ ...raw }),
} as const;
