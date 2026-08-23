import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	getPortalBranchesBySlug,
	getPortalBySlug,
	getPortalServicesBySlug,
	portalApi,
} from "@/lib/api/portal.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidatePortal } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";

export const usePortalConfig = () =>
	useQuery({
		queryKey: queryKeys.portal.config(),
		queryFn: () => portalApi.getPortalConfig(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const usePortalServices = () =>
	useQuery({
		queryKey: queryKeys.portal.services(),
		queryFn: () => portalApi.getPortalServices(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const usePortalStats = () =>
	useQuery({
		queryKey: queryKeys.portal.stats(),
		queryFn: () => portalApi.getPortalStats(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const usePortalBookings = () =>
	useQuery({
		queryKey: queryKeys.portal.bookings(),
		queryFn: () => portalApi.getPortalBookings(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const usePortalReviews = () =>
	useQuery({
		queryKey: queryKeys.portal.reviews(),
		queryFn: () => portalApi.getPortalReviews(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const usePublicPortalConfig = (slug: string) =>
	useQuery({
		queryKey: queryKeys.publicPortal.config(slug),
		queryFn: () => getPortalBySlug({ data: slug }),
		enabled: !!slug,
		staleTime: QUERY_POLICY.static.staleTime,
		gcTime: QUERY_POLICY.static.gcTime,
	});

export const usePublicPortalServices = (slug: string) =>
	useQuery({
		queryKey: queryKeys.publicPortal.services(slug),
		queryFn: () => getPortalServicesBySlug({ data: slug }),
		enabled: !!slug,
		staleTime: QUERY_POLICY.static.staleTime,
		gcTime: QUERY_POLICY.static.gcTime,
	});

export const usePublicPortalBranches = (slug: string) =>
	useQuery({
		queryKey: queryKeys.publicPortal.branches(slug),
		queryFn: () => getPortalBranchesBySlug({ data: slug }),
		enabled: !!slug,
		staleTime: QUERY_POLICY.static.staleTime,
		gcTime: QUERY_POLICY.static.gcTime,
	});

export const useUpdatePortalConfig = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			portalApi.updatePortalConfig({ data }),
		onSuccess: () => invalidatePortal(queryClient),
	});
};

export const useCreatePortalService = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			portalApi.createPortalService({ data }),
		onSuccess: () => invalidatePortal(queryClient),
	});
};

export const useDeletePortalService = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => portalApi.deletePortalService({ data: id }),
		onSuccess: () => invalidatePortal(queryClient),
	});
};

export const useUpdatePortalBookingStatus = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			portalApi.updatePortalBookingStatus({ data }),
		onSuccess: () => invalidatePortal(queryClient),
	});
};
