import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TLoyaltyConfig } from "@/domain/loyalty";
import { updateLoyaltyConfig } from "@/lib/api/loyalty.functions";
import { FormBuilder } from "@/lib/form-builder";
import { LoyaltyConfigDocType } from "@/lib/form-builder/examples/loyalty-config.doctype";
import { invalidateLoyalty } from "@/shared/cache/invalidation";
import { extractErrorMessage } from "@/shared/utils/error";

export type TLoyaltyConfigFormProps = {
	readonly config: TLoyaltyConfig;
};

export const LoyaltyConfigForm = ({ config }: TLoyaltyConfigFormProps) => {
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	const updateMutation = useMutation({
		mutationFn: (data: {
			points_per_rupiah: number;
			points_expiry_days: number;
			min_redeem_points: number;
			is_active: boolean;
		}) => updateLoyaltyConfig({ data }),
		onSuccess: () => {
			invalidateLoyalty(queryClient);
		},
	});

	const handleSubmit = useCallback(
		async (values: Record<string, unknown>) => {
			try {
				await updateMutation.mutateAsync({
					points_per_rupiah: values.points_per_rupiah as number,
					points_expiry_days: values.points_expiry_days as number,
					min_redeem_points: values.min_redeem_points as number,
					is_active: values.is_active as boolean,
				});
				return { message: t("loyalty.toast_update_success") };
			} catch (err) {
				const message = extractErrorMessage(
					err,
					t("loyalty.toast_update_error"),
				);
				return { message, error: true };
			}
		},
		[updateMutation, t],
	);

	return (
		<FormBuilder
			doctype={LoyaltyConfigDocType}
			mode="edit"
			initialValues={{
				is_active: config.isActive,
				points_per_rupiah: config.pointsPerRupiah,
				points_expiry_days: config.pointsExpiryDays,
				min_redeem_points: config.minRedeemPoints,
			}}
			onSubmit={handleSubmit}
		/>
	);
};
