import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CreateRackLocationCommand,
	CreateWarehouseCommand,
} from "@/domain/warehouse/warehouse.schemas";
import {
	createRackLocation,
	createWarehouse,
	deleteRackLocation,
	deleteWarehouse,
	getRackLocations,
	getWarehouses,
	updateRackLocation,
	updateWarehouse,
} from "@/lib/api/warehouse.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateWarehouses } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";

export const useWarehouses = () =>
	useQuery({
		queryKey: queryKeys.warehouses.list(),
		queryFn: () => getWarehouses(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useRackLocations = (warehouseId: string) =>
	useQuery({
		queryKey: queryKeys.warehouses.rackLocations(warehouseId),
		queryFn: () => getRackLocations({ data: warehouseId }),
		enabled: !!warehouseId,
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useCreateWarehouse = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateWarehouseCommand) => createWarehouse({ data }),
		onSuccess: () => invalidateWarehouses(queryClient),
	});
};

export const useUpdateWarehouse = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; data: CreateWarehouseCommand }) =>
			updateWarehouse({ data: input }),
		onSuccess: () => invalidateWarehouses(queryClient),
	});
};

export const useDeleteWarehouse = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteWarehouse({ data: id }),
		onSuccess: () => invalidateWarehouses(queryClient),
	});
};

export const useCreateRackLocation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateRackLocationCommand) =>
			createRackLocation({ data }),
		onSuccess: () => invalidateWarehouses(queryClient),
	});
};

export const useUpdateRackLocation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; data: CreateRackLocationCommand }) =>
			updateRackLocation({ data: input }),
		onSuccess: () => invalidateWarehouses(queryClient),
	});
};

export const useDeleteRackLocation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteRackLocation({ data: id }),
		onSuccess: () => invalidateWarehouses(queryClient),
	});
};
