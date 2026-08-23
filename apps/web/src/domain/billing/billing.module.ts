import type {
	TBillingCycle,
	TSubscription,
	TSubscriptionPlan,
} from "./billing.types";

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
