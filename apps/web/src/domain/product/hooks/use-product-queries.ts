import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	addProduct,
	addVariant,
	deleteProduct,
	deleteVariant,
	getProducts,
	importProducts,
	updateProduct,
	updateVariant,
} from "@/lib/api/products.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateProducts } from "@/shared/cache/invalidation";
import {
	optimisticRemoveFromList,
	rollbackOptimisticSnapshot,
} from "@/shared/cache/optimistic";
import { queryKeys } from "@/shared/cache/query-keys";
import type {
	TProduct,
	TProductProps,
	TProductVariantProps,
} from "../product.types";

/**
 * Domain hook boundary for products.
 *
 * Routes/components should consume these hooks instead of writing
 * `useQuery({ queryKey: [...] })` inline. The boundary hides the cache
 * key factory and the operational cache policy so a single edit here
 * propagates to every consumer.
 */

export const useProducts = () =>
	useQuery({
		queryKey: queryKeys.products.list(),
		queryFn: () => getProducts(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useCreateProduct = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: TProductProps) => addProduct({ data }),
		onSuccess: () => invalidateProducts(queryClient),
	});
};

export const useUpdateProduct = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: TProductProps) => updateProduct({ data }),
		onSuccess: () => invalidateProducts(queryClient),
	});
};

export const useDeleteProduct = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteProduct({ data: id }),
		onMutate: async (id: string) =>
			optimisticRemoveFromList<TProduct>(
				queryClient,
				queryKeys.products.list(),
				(product) => product.id === id,
			),
		onError: (_err, _id, snapshot) =>
			rollbackOptimisticSnapshot(queryClient, snapshot),
		onSettled: () => invalidateProducts(queryClient),
	});
};

export const useImportProducts = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (
			data: Parameters<typeof importProducts>[0] extends {
				data: infer D;
			}
				? D
				: never,
		) => importProducts({ data }),
		onSuccess: () => invalidateProducts(queryClient),
	});
};

export const useAddVariant = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: TProductVariantProps) => addVariant({ data }),
		onSuccess: () => invalidateProducts(queryClient),
	});
};

export const useUpdateVariant = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: TProductVariantProps) => updateVariant({ data }),
		onSuccess: () => invalidateProducts(queryClient),
	});
};

export const useDeleteVariant = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteVariant({ data: id }),
		onSuccess: () => invalidateProducts(queryClient),
	});
};
