import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import type { TLoyaltyConfig } from "@/domain/loyalty";
import { updateLoyaltyConfig } from "@/lib/api/loyalty.functions";
import { invalidateLoyalty } from "@/shared/cache/invalidation";
import { extractErrorMessage } from "@/shared/utils/error";

export type TUseLoyaltyConfigFormProps = {
	readonly config: TLoyaltyConfig;
};

export type TLoyaltyConfigInput = {
	readonly points_per_rupiah: number;
	readonly points_expiry_days: number;
	readonly min_redeem_points: number;
	readonly is_active: boolean;
};

export const useLoyaltyConfigForm = ({
	config,
}: TUseLoyaltyConfigFormProps) => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState({
		pointsPerRupiah: config.pointsPerRupiah,
		pointsExpiryDays: config.pointsExpiryDays,
		minRedeemPoints: config.minRedeemPoints,
		isActive: config.isActive,
	});

	const updateMutation = useMutation({
		mutationFn: (data: TLoyaltyConfigInput) => updateLoyaltyConfig({ data }),
		onSuccess: () => {
			toast.success(t("toast.loyalty.update_success_title"), {
				description: t("toast.loyalty.update_success_desc"),
			});
			invalidateLoyalty(queryClient);
		},
		onError: (err: Error) =>
			toast.error(t("toast.loyalty.update_error_title"), {
				description: extractErrorMessage(
					err,
					t("toast.loyalty.update_error_desc"),
				),
			}),
	});

	const setField = useCallback(
		(field: string, value: string | number | boolean) => {
			setFormData((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	const submit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			updateMutation.mutate({
				points_per_rupiah: formData.pointsPerRupiah,
				points_expiry_days: formData.pointsExpiryDays,
				min_redeem_points: formData.minRedeemPoints,
				is_active: formData.isActive,
			});
		},
		[formData, updateMutation],
	);

	return {
		formData,
		isLoading: updateMutation.isPending,
		setField,
		submit,
	};
};
