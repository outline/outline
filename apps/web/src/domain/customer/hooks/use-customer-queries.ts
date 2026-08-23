import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createCustomer,
	deleteCustomer,
	getCustomers,
	updateCustomer,
} from "@/lib/api/customer.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateCustomers } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";

/**
 * Domain hook boundary for customers.
 */

export const useCustomers = (search?: string) =>
	useQuery({
		queryKey: queryKeys.customers.list(search),
		queryFn: () => getCustomers({ data: search || "" }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useCreateCustomer = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => createCustomer({ data }),
		onSuccess: () => invalidateCustomers(queryClient),
	});
};

export const useUpdateCustomer = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => updateCustomer({ data }),
		onSuccess: (_data, variables) =>
			invalidateCustomers(
				queryClient,
				"id" in variables && typeof variables.id === "string"
					? variables.id
					: undefined,
			),
	});
};

export const useDeleteCustomer = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteCustomer({ data: id }),
		onSuccess: () => invalidateCustomers(queryClient),
	});
};
