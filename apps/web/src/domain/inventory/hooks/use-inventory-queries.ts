import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TProductVariantId } from "@/domain/product/product.types";
import {
	addBatch,
	deductStock,
	getBatches,
	getExpiringBatches,
	getMovements,
} from "@/lib/api/inventory.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import {
	invalidateInventory,
	invalidateProducts,
} from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";

export const useBatches = (variantId: string) =>
	useQuery({
		queryKey: queryKeys.inventory.productBatches(variantId),
		queryFn: () => getBatches({ data: variantId as TProductVariantId }),
		enabled: !!variantId,
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useExpiringBatches = (days: number) =>
	useQuery({
		queryKey: queryKeys.inventory.expiringBatches(),
		queryFn: () => getExpiringBatches({ data: days }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useMovements = (variantId?: string) =>
	useQuery({
		queryKey: variantId
			? [...queryKeys.inventory.movements(), variantId]
			: queryKeys.inventory.movements(),
		queryFn: () =>
			variantId
				? getMovements({ data: variantId as TProductVariantId })
				: Promise.resolve([]),
		enabled: !!variantId,
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useAddBatch = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => addBatch({ data }),
		onSuccess: () => {
			invalidateInventory(queryClient);
			invalidateProducts(queryClient);
		},
	});
};

export const useDeductStock = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => deductStock({ data }),
		onSuccess: () => {
			invalidateInventory(queryClient);
			invalidateProducts(queryClient);
		},
	});
};
