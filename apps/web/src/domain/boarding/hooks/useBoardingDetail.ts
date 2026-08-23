import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import {
	deleteBoarding,
	getBoardingById,
	updateBoardingStatus,
} from "@/lib/api/boardings.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateBoardings } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";
import type { TBoardingWithPetsDto } from "../boarding.dto";

export type TUseBoardingDetailResult = {
	readonly boarding: TBoardingWithPetsDto | null;
	readonly isLoading: boolean;
	readonly isError: boolean;
	readonly isEditOpen: boolean;
	readonly isCheckoutOpen: boolean;
	readonly setEditOpen: (open: boolean) => void;
	readonly setCheckoutOpen: (open: boolean) => void;
	readonly activate: () => Promise<void>;
	readonly remove: () => Promise<void>;
	readonly checkout: (paymentMethod: string) => Promise<void>;
	readonly refresh: () => void;
};

export const useBoardingDetail = (id: string): TUseBoardingDetailResult => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [isEditOpen, setEditOpen] = useState(false);
	const [isCheckoutOpen, setCheckoutOpen] = useState(false);

	const {
		data: boarding,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: queryKeys.boardings.detail(id),
		queryFn: () => getBoardingById({ data: id }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

	const activateMutation = useMutation({
		mutationFn: () => updateBoardingStatus({ data: { id, status: "active" } }),
		onSuccess: () => {
			toast.success(t("toast.boarding.activate_success_title"), {
				description: t("toast.boarding.activate_success_desc"),
			});
			invalidateBoardings(queryClient, id);
		},
		onError: (err: Error) =>
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(err, t("common.error")),
			}),
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteBoarding({ data: id }),
		onSuccess: () => {
			toast.success(t("toast.boarding.note_delete_success_title"), {
				description: t("toast.boarding.note_delete_success_desc"),
			});
			invalidateBoardings(queryClient, id);
		},
		onError: (err: Error) =>
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(err, t("common.error")),
			}),
	});

	const checkoutMutation = useMutation({
		mutationFn: (_paymentMethod: string) =>
			updateBoardingStatus({ data: { id, status: "completed" } }),
		onSuccess: () => {
			toast.success(t("toast.boarding.checkout_success_title"), {
				description: t("toast.boarding.checkout_success_desc"),
			});
			invalidateBoardings(queryClient, id);
			setCheckoutOpen(false);
		},
		onError: (err: Error) =>
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(err, t("common.error")),
			}),
	});

	return {
		boarding: boarding || null,
		isLoading,
		isError,
		isEditOpen,
		isCheckoutOpen,
		setEditOpen,
		setCheckoutOpen,
		activate: async () => {
			await activateMutation.mutateAsync();
		},
		remove: async () => {
			await deleteMutation.mutateAsync();
		},
		checkout: async (method) => {
			await checkoutMutation.mutateAsync(method);
		},
		refresh: refetch,
	};
};
