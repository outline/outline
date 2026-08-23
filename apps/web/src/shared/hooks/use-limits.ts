import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { subscriptionsApi } from "@/lib/api/subscriptions.functions";
import { SAAS_LIMITS } from "@/lib/constants";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLimitModal } from "./use-limit-modal";

export function useLimits() {
	const { showLimitModal } = useLimitModal();
	const { data: subscription } = useQuery({
		queryKey: queryKeys.billing.subscription(),
		queryFn: () => subscriptionsApi.getSubscription(),
		staleTime: QUERY_POLICY.session.staleTime,
		gcTime: QUERY_POLICY.session.gcTime,
	});
	const { data: usage } = useQuery({
		queryKey: queryKeys.billing.usageMetrics(),
		queryFn: () => subscriptionsApi.getUsageMetrics(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

	const plan = (subscription?.plan || "free") as keyof typeof SAAS_LIMITS;
	const limits = SAAS_LIMITS[plan];

	// Stable callbacks. Returning fresh arrow functions on every render
	// caused downstream useCallback/useEffect deps to invalidate on every
	// render, which in pos.tsx (and any consumer that puts these in an
	// effect dep list) triggered an infinite refetch loop. See
	// use-limits-stability.test.tsx for the regression test.
	const checkLimit = useCallback(
		(type: keyof typeof limits) => {
			if (!usage) return true;
			const current = usage[type as keyof typeof usage] || 0;
			const limit = limits[type] as number;
			return current < limit;
		},
		[usage, limits],
	);

	const showUpgradeModal = useCallback(
		(type: Parameters<typeof showLimitModal>[0]) => showLimitModal(type),
		[showLimitModal],
	);

	const isAtLimit = useCallback(
		(type: keyof typeof limits) => {
			if (!usage) return false;
			const current = usage[type as keyof typeof usage] || 0;
			const limit = limits[type] as number;
			return current >= limit;
		},
		[usage, limits],
	);

	return {
		plan,
		limits,
		usage,
		checkLimit,
		showUpgradeModal,
		isAtLimit,
	};
}
