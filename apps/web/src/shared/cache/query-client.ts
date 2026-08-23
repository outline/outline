import { QueryClient } from "@tanstack/react-query";
import { QUERY_POLICY } from "./cache-policy";

/**
 * App-wide React Query client factory.
 *
 * Default cache tier is `operational` so a query that forgets to pass
 * `staleTime`/`gcTime` does not silently disable background refresh
 * (`staleTime: 0` would force every mount to refetch).
 *
 * Mut retries are disabled (`retry: 0`) — business mutations must be
 * idempotent server-side; client-side retries on user actions are
 * anti-pattern and risk double-submit.
 */
export const createAppQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: QUERY_POLICY.operational.staleTime,
				gcTime: QUERY_POLICY.operational.gcTime,
				retry: 1,
				refetchOnWindowFocus: false,
				refetchOnReconnect: true,
				refetchOnMount: true,
			},
			mutations: {
				retry: 0,
			},
		},
	});
