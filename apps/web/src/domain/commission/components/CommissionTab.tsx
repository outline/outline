import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TStaffId } from "@/domain/staff/staff.types";
import {
	addCommissionRule,
	getCommissionRecords,
	getCommissionRule,
	payCommissions,
	updateCommissionRule,
} from "@/lib/api/commission.functions";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatCurrency } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import { CommissionHistory } from "./CommissionHistory";
import { CommissionRuleForm, type RuleFormValues } from "./CommissionRuleForm";

export function CommissionTab({ staffId }: { staffId: TStaffId }) {
	const queryClient = useQueryClient();
	const [isEditingRule, setIsEditingRule] = useState(false);
	const { t } = useTranslation();

	const { data: rule, isLoading: isLoadingRule } = useQuery({
		queryKey: ["commissionRule", staffId],
		queryFn: () => getCommissionRule({ data: staffId }),
	});

	const { data: records, isLoading: isLoadingRecords } = useQuery({
		queryKey: ["commissionRecords", staffId],
		queryFn: () => getCommissionRecords({ data: staffId }),
	});

	const saveRuleMutation = useMutation({
		mutationFn: async (values: RuleFormValues) => {
			if (rule) {
				return updateCommissionRule({ data: { id: rule.id, ...values } });
			} else {
				return addCommissionRule({ data: { staffId, ...values } });
			}
		},
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.commission_saved"),
			});
			queryClient.invalidateQueries({ queryKey: ["commissionRule", staffId] });
			setIsEditingRule(false);
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const payMutation = useMutation({
		mutationFn: async () => {
			return payCommissions({ data: staffId });
		},
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.commission_paid"),
			});
			queryClient.invalidateQueries({
				queryKey: ["commissionRecords", staffId],
			});
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const onSubmitRule = (values: RuleFormValues) => {
		saveRuleMutation.mutate(values);
	};

	const pendingRecords = records?.filter((r) => r.status === "pending") || [];
	const totalPending = pendingRecords.reduce((acc, r) => acc + r.amount, 0);

	return (
		<div className="space-y-8">
			{/* Aturan Komisi Section */}
			<div className="p-6 border border-neutral-200/60 rounded-xl bg-white">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3 className="text-lg font-bold text-neutral-900">
							{t("commission.rule_title")}
						</h3>
						<p className="text-sm text-neutral-500">
							{t("commission.rule_subtitle")}
						</p>
					</div>
					{!isEditingRule && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditingRule(true)}
						>
							{t("commission.edit_rule")}
						</Button>
					)}
				</div>

				{isEditingRule ? (
					<CommissionRuleForm
						{...(rule
							? {
									initialValues: {
										model: rule.model,
										ratePercent: rule.ratePercent,
										rateFixed: rule.rateFixed,
										rateSmall: rule.rateSmall,
										rateMedium: rule.rateMedium,
										rateLarge: rule.rateLarge,
										rateXl: rule.rateXl,
										includeAddons: rule.includeAddons,
									},
								}
							: {})}
						onSubmit={onSubmitRule}
						onCancel={() => setIsEditingRule(false)}
						isSubmitting={saveRuleMutation.isPending}
					/>
				) : isLoadingRule ? (
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2"
							>
								<Skeleton className="h-3 w-16 rounded-lg" />
								<Skeleton className="h-5 w-20 rounded-lg" />
							</div>
						))}
					</div>
				) : !rule ? (
					<div className="py-6 text-center text-sm text-neutral-500 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
						{t("commission.no_rule_desc")}
					</div>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
							<div className="text-xs font-medium text-neutral-500 mb-1">
								{t("common.status")}
							</div>
							<div className="font-bold text-neutral-900 capitalize">
								{rule.model === "size_tier" ? "Size Tier" : rule.model}
							</div>
						</div>
						<div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
							<div className="text-xs font-medium text-neutral-500 mb-1">
								Rate
							</div>
							<div className="font-bold text-neutral-900">
								{rule.model === "percentage"
									? `${rule.ratePercent}%`
									: rule.model === "fixed"
										? formatCurrency(rule.rateFixed)
										: "Multi (S,M,L,XL)"}
							</div>
						</div>
						<div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100">
							<div className="text-xs font-medium text-neutral-500 mb-1">
								Include Addons
							</div>
							<div className="font-bold text-neutral-900">
								{rule.includeAddons
									? t("common.yes", "Ya")
									: t("common.no", "Tidak")}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Riwayat & Saldo Komisi section */}
			<CommissionHistory
				records={(records ?? []).map((r) => ({
					id: r.id as string,
					createdAt:
						r.createdAt instanceof Date
							? r.createdAt.toISOString()
							: r.createdAt,
					referenceType: r.referenceType,
					status: r.status,
					amount: r.amount,
				}))}
				isLoading={isLoadingRecords}
				totalPending={totalPending}
				onPay={() => {
					if (
						confirm(
							t("commission.pay_confirm", {
								amount: formatCurrency(totalPending),
							}),
						)
					) {
						payMutation.mutate();
					}
				}}
				isPaying={payMutation.isPending}
			/>
		</div>
	);
}
