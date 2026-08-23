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

export const useCustomers = (search?: string) => {
	return useQuery({
		queryKey: queryKeys.customers.list(search),
		queryFn: () => getCustomers({ data: search || "" }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});
};

export const useCreateCustomer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createCustomer,
		onSuccess: () => {
			invalidateCustomers(queryClient);
		},
	});
};

export const useUpdateCustomer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateCustomer,
		onSuccess: (data) => {
			invalidateCustomers(queryClient, data.id);
		},
	});
};

export const useDeleteCustomer = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteCustomer,
		onSuccess: () => {
			invalidateCustomers(queryClient);
		},
	});
};
