import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	BillListLinear,
	AddCircleLinear as Plus,
	TrashBinMinimalisticLinear as Trash,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	addBoardingCharge,
	getBoardingCharges,
} from "@/lib/api/boardings.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLanguage } from "@/shared/i18n";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { EmptyState } from "@/ui";

export const BoardingOpenBill = ({ boardingId }: { boardingId: string }) => {
	const { t } = useTranslation();
	const { language } = useLanguage();
	const queryClient = useQueryClient();
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [newCharge, setNewCharge] = useState({ description: "", amount: "" });

	const { data: charges = [], isLoading } = useQuery({
		queryKey: queryKeys.boardings.charges(boardingId),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		queryFn: () => getBoardingCharges({ data: boardingId }),
	});

	const addChargeMutation = useMutation({
		mutationFn: () =>
			addBoardingCharge({
				data: {
					boardingId,
					description: newCharge.description,
					amount: Number(newCharge.amount),
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("toast.boarding.charge_add_success"),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.boardings.charges(boardingId),
			});
			setIsAddOpen(false);
			setNewCharge({ description: "", amount: "" });
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(
					error,
					t("toast.boarding.charge_add_error"),
				),
			});
		},
	});

	const totalAmount = charges.reduce((acc, curr) => acc + curr.amount, 0);

	return (
		<div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col">
			<div className="p-6 border-b border-neutral-100 flex items-center justify-between">
				<div>
					<h3 className="text-lg font-bold text-neutral-900 tracking-tight">
						{t("boarding.open_bill_title")}
					</h3>
					<p className="text-sm text-neutral-500 mt-1">
						{t("boarding.open_bill_desc")}
					</p>
				</div>
				<Button
					size="sm"
					className="rounded-xl"
					onClick={() => setIsAddOpen(true)}
				>
					<Plus className="w-4 h-4 mr-2" /> {t("boarding.add_charge")}
				</Button>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
					<thead>
						<tr className="border-b border-neutral-100 bg-neutral-50/50">
							<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
								{t("common.date")}
							</th>
							<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
								{t("common.description")}
							</th>
							<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right">
								{t("common.amount")}
							</th>
							<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right w-[80px]">
								{t("common.action")}
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-100">
						{isLoading ? (
							[1, 2, 3].map((i) => (
								<tr key={i}>
									<td className="py-4 px-6">
										<Skeleton className="h-4 w-20 rounded-lg" />
									</td>
									<td className="py-4 px-6">
										<Skeleton className="h-4 w-40 rounded-lg" />
									</td>
									<td className="py-4 px-6 text-right">
										<Skeleton className="h-4 w-16 rounded-lg ml-auto" />
									</td>
									<td className="py-4 px-6 text-right">
										<Skeleton className="h-8 w-8 rounded-lg ml-auto" />
									</td>
								</tr>
							))
						) : charges.length === 0 ? (
							<tr>
								<td colSpan={4} className="py-8">
									<EmptyState
										title={t("boarding.no_charges_title")}
										description={t("boarding.no_charges_desc")}
										icon={BillListLinear}
									/>
								</td>
							</tr>
						) : (
							charges.map((charge) => (
								<tr
									key={charge.id}
									className="hover:bg-neutral-50/50 transition-colors"
								>
									<td className="py-4 px-6 text-[12px] text-neutral-600">
										{formatDate(new Date(charge.chargeDate), language, {
											dateStyle: "medium",
										})}
									</td>
									<td className="py-4 px-6 text-[12px] font-medium text-neutral-900">
										{charge.description}
									</td>
									<td className="py-4 px-6 text-[12px] text-neutral-900 font-bold text-right">
										{formatCurrency(charge.amount, language || "id")}
									</td>
									<td className="py-4 px-6 text-right">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
										>
											<Trash className="w-4 h-4" />
										</Button>
									</td>
								</tr>
							))
						)}
					</tbody>
					{charges.length > 0 && (
						<tfoot className="bg-neutral-50/50 border-t border-neutral-200">
							<tr>
								<td
									colSpan={2}
									className="py-4 px-6 text-[13px] font-bold text-neutral-900 text-right"
								>
									{t("boarding.total_open_bill")}
								</td>
								<td className="py-4 px-6 text-[14px] font-bold text-emerald-600 text-right">
									{formatCurrency(totalAmount, language || "id")}
								</td>
								<td></td>
							</tr>
						</tfoot>
					)}
				</table>
			</div>

			<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("boarding.add_incidental_charge_title")}
						</DialogTitle>
						<DialogDescription>
							{t("boarding.add_incidental_charge_desc")}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>{t("common.description")}</Label>
							<Input
								placeholder="Contoh: Premium Wet Food"
								value={newCharge.description}
								onChange={(e) =>
									setNewCharge({ ...newCharge, description: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<Label>{t("common.price_label")}</Label>
							<Input
								type="number"
								placeholder="Contoh: 25000"
								value={newCharge.amount}
								onChange={(e) =>
									setNewCharge({ ...newCharge, amount: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsAddOpen(false)}>
							{t("common.cancel")}
						</Button>
						<Button
							onClick={() => addChargeMutation.mutate()}
							disabled={
								!newCharge.description ||
								!newCharge.amount ||
								addChargeMutation.isPending
							}
						>
							{addChargeMutation.isPending
								? t("common.saving")
								: t("boarding.save_charge")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};
