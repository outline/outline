import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	addBoardingCharge,
	addBoardingDailyPhoto,
	deleteBoarding,
	getBoardingById,
	getBoardingCharges,
	getBoardingDailyPhotos,
	getBoardings,
	importBoardings,
	updateBoarding,
	updateBoardingStatus,
} from "@/lib/api/boardings.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateBoardings } from "@/shared/cache/invalidation";
import {
	optimisticPatchListItem,
	optimisticRemoveFromList,
	rollbackOptimisticSnapshot,
} from "@/shared/cache/optimistic";
import { queryKeys } from "@/shared/cache/query-keys";
import type { TBoardingDto, TBoardingWithPetsDto } from "../boarding.dto";

/**
 * Domain hook boundary for boardings.
 */

export const useBoardings = () =>
	useQuery({
		queryKey: queryKeys.boardings.list(),
		queryFn: () => getBoardings(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useBoardingDetail = (id: string) =>
	useQuery({
		queryKey: queryKeys.boardings.detail(id),
		queryFn: () => getBoardingById({ data: id }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		enabled: !!id,
	});

export const useBoardingPhotos = (boardingId: string) =>
	useQuery({
		queryKey: queryKeys.boardings.photos(boardingId),
		queryFn: () => getBoardingDailyPhotos({ data: boardingId }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		enabled: !!boardingId,
	});

export const useBoardingCharges = (boardingId: string) =>
	useQuery({
		queryKey: queryKeys.boardings.charges(boardingId),
		queryFn: () => getBoardingCharges({ data: boardingId }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		enabled: !!boardingId,
	});

export const useDeleteBoarding = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => deleteBoarding({ data: id }),
		onMutate: async (id: string) =>
			optimisticRemoveFromList<TBoardingDto>(
				queryClient,
				queryKeys.boardings.list(),
				(boarding) => boarding.id === id,
			),
		onError: (_err, _id, snapshot) =>
			rollbackOptimisticSnapshot(queryClient, snapshot),
		onSettled: (_data, _err, id) => invalidateBoardings(queryClient, id),
	});
};

export const useCompleteBoarding = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			updateBoardingStatus({ data: { id, status: "completed" } }),
		onMutate: async (id: string) =>
			optimisticPatchListItem<TBoardingDto>(
				queryClient,
				queryKeys.boardings.list(),
				(boarding) => boarding.id === id,
				(boarding) => ({ ...boarding, status: "completed" as const }),
			),
		onError: (_err, _id, snapshot) =>
			rollbackOptimisticSnapshot(queryClient, snapshot),
		onSettled: (_data, _err, id) => invalidateBoardings(queryClient, id),
	});
};

export const useUpdateBoardingStatus = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { id: string; status: string }) =>
			updateBoardingStatus({ data: input }),
		onSuccess: (_data, variables) =>
			invalidateBoardings(queryClient, variables.id),
	});
};

export const useUpdateBoarding = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => updateBoarding({ data }),
		onSuccess: (_data, variables) =>
			invalidateBoardings(
				queryClient,
				"id" in variables && typeof variables.id === "string"
					? variables.id
					: undefined,
			),
	});
};

export const useAddBoardingCharge = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => addBoardingCharge({ data }),
		onSuccess: (_data, variables) => {
			const boardingId =
				"boardingId" in variables
					? (variables as { boardingId: string }).boardingId
					: undefined;
			invalidateBoardings(queryClient, boardingId);
		},
	});
};

export const useAddBoardingDailyPhoto = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			addBoardingDailyPhoto({ data }),
		onSuccess: (_data, variables) => {
			const boardingId =
				"boardingId" in variables
					? (variables as { boardingId: string }).boardingId
					: undefined;
			invalidateBoardings(queryClient, boardingId);
		},
	});
};

export const useImportBoardings = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) => importBoardings({ data }),
		onSuccess: () => invalidateBoardings(queryClient),
	});
};

// TBoardingWithPetsDto is intentionally re-exported so detail
// consumers can type their component props without a separate import.
export type { TBoardingWithPetsDto };
