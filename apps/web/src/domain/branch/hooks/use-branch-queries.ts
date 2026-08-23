import { useQuery } from "@tanstack/react-query";
import { getBranches } from "@/lib/api/branches.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";

export const useBranches = () =>
	useQuery({
		queryKey: queryKeys.branches.list(),
		queryFn: () => getBranches(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});
