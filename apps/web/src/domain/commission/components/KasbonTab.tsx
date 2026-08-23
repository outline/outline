import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { TStaffId } from "@/domain/staff/staff.types";
import {
	addKasbon,
	getKasbon,
	payKasbon,
} from "@/lib/api/commission.functions";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatCurrency } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";

const addKasbonSchema = z.object({
	amount: z.number().min(1, "Minimal Rp1"),
	installmentAmount: z.number().min(0, "Minimal Rp0"),
	notes: z.string().optional(),
});

type AddKasbonValues = z.infer<typeof addKasbonSchema>;

const payKasbonSchema = z.object({
	kasbonId: z.string().min(1),
	amount: z.number().min(1, "Minimal Rp1"),
	source: z.enum(["manual", "commission_deduction"]),
});

type PayKasbonValues = z.infer<typeof payKasbonSchema>;

export function KasbonTab({ staffId }: { staffId: TStaffId }) {
	const queryClient = useQueryClient();
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [isPayOpen, setIsPayOpen] = useState(false);
	const { t } = useTranslation();

	const { data: kasbons, isLoading } = useQuery({
		queryKey: ["kasbon", staffId],
		queryFn: () => getKasbon({ data: staffId }),
	});

	const addForm = useForm<AddKasbonValues>({
		resolver: zodResolver(addKasbonSchema),
		defaultValues: {
			amount: 0,
			installmentAmount: 0,
			notes: "",
		},
	});

	const payForm = useForm<PayKasbonValues>({
		resolver: zodResolver(payKasbonSchema),
		defaultValues: {
			kasbonId: "",
			amount: 0,
			source: "manual",
		},
	});

	const addMutation = useMutation({
		mutationFn: (values: AddKasbonValues) =>
			addKasbon({ data: { staffId, ...values } }),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.kasbon_added"),
			});
			queryClient.invalidateQueries({ queryKey: ["kasbon", staffId] });
			setIsAddOpen(false);
			addForm.reset();
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const payMutation = useMutation({
		mutationFn: (values: PayKasbonValues) => payKasbon({ data: values }),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.kasbon_paid"),
			});
			queryClient.invalidateQueries({ queryKey: ["kasbon", staffId] });
			setIsPayOpen(false);
			payForm.reset();
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const totalRemaining = kasbons?.reduce((acc, k) => acc + k.remaining, 0) || 0;

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="md:col-span-1 p-6 bg-amber-50 rounded-xl border border-amber-100 flex flex-col justify-center">
					<div className="text-sm font-medium text-amber-800 mb-1">
						{t("commission.active_debt")}
					</div>
					<div className="text-3xl font-bold text-amber-600">
						{formatCurrency(totalRemaining)}
					</div>

					<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
						<DialogTrigger asChild>
							<Button className="mt-6 w-full" variant="outline">
								{t("commission.add_kasbon")}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{t("commission.add_kasbon")}</DialogTitle>
							</DialogHeader>
							<form
								onSubmit={addForm.handleSubmit((v) => addMutation.mutate(v))}
								className="space-y-4 pt-4"
							>
								<div className="space-y-2">
									<Label>{t("commission.loan_amount")}</Label>
									<Input
										type="number"
										{...addForm.register("amount", { valueAsNumber: true })}
									/>
								</div>
								<div className="space-y-2">
									<Label>{t("commission.installment_amount")}</Label>
									<Input
										type="number"
										{...addForm.register("installmentAmount", {
											valueAsNumber: true,
										})}
									/>
								</div>
								<div className="space-y-2">
									<Label>{t("common.notes")}</Label>
									<Input
										{...addForm.register("notes")}
										placeholder={t("commission.notes_placeholder")}
									/>
								</div>
								<Button
									type="submit"
									className="w-full"
									disabled={addMutation.isPending}
								>
									{addMutation.isPending
										? t("common.saving")
										: t("commission.save_kasbon")}
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				</div>

				<div className="md:col-span-2 border border-neutral-200/60 rounded-xl bg-white overflow-hidden">
					<div className="grid grid-cols-5 gap-4 px-6 py-3 bg-neutral-50 border-b border-neutral-200/60 text-xs font-bold text-neutral-400 uppercase tracking-widest">
						<div>{t("common.date")}</div>
						<div>{t("common.notes")}</div>
						<div className="text-right">{t("common.amount")}</div>
						<div className="text-right">{t("commission.remaining")}</div>
						<div className="text-right">{t("common.action")}</div>
					</div>
					<div className="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
						{isLoading ? (
							[1, 2, 3].map((i) => (
								<div
									key={i}
									className="grid grid-cols-5 gap-4 px-6 py-4 items-center"
								>
									<Skeleton className="h-4 w-20 rounded-lg" />
									<Skeleton className="h-4 w-28 rounded-lg" />
									<Skeleton className="h-4 w-16 rounded-lg ml-auto" />
									<Skeleton className="h-4 w-16 rounded-lg ml-auto" />
									<Skeleton className="h-8 w-16 rounded-lg ml-auto" />
								</div>
							))
						) : kasbons?.length === 0 ? (
							<div className="p-8 text-center text-sm text-neutral-400">
								{t("commission.no_kasbon")}
							</div>
						) : (
							kasbons?.map((k) => (
								<div
									key={k.id}
									className="grid grid-cols-5 gap-4 px-6 py-4 items-center text-sm"
								>
									<div className="text-neutral-900 font-medium">
										{new Date(k.createdAt).toLocaleDateString("id-ID")}
									</div>
									<div
										className="text-neutral-500 truncate"
										title={k.notes || "-"}
									>
										{k.notes || "-"}
									</div>
									<div className="text-right text-neutral-500">
										{formatCurrency(k.amount)}
									</div>
									<div className="text-right font-bold text-amber-600">
										{formatCurrency(k.remaining)}
									</div>
									<div className="text-right">
										{k.remaining > 0 ? (
											<Button
												size="sm"
												variant="outline"
												onClick={() => {
													payForm.setValue("kasbonId", k.id);
													payForm.setValue(
														"amount",
														k.installmentAmount > 0
															? Math.min(k.installmentAmount, k.remaining)
															: k.remaining,
													);
													setIsPayOpen(true);
												}}
											>
												{t("common.pay", "Bayar")}
											</Button>
										) : (
											<span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
												{t("commission.paid_off")}
											</span>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>

			<Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("commission.kasbon_payment")}</DialogTitle>
					</DialogHeader>
					<form
						onSubmit={payForm.handleSubmit((v) => payMutation.mutate(v))}
						className="space-y-4 pt-4"
					>
						<div className="space-y-2">
							<Label>{t("commission.payment_method")}</Label>
							<Controller
								control={payForm.control}
								name="source"
								render={({ field }) => (
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue
												placeholder={t("commission.method_placeholder")}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="manual">
												{t("commission.manual_payment")}
											</SelectItem>
											<SelectItem value="commission_deduction">
												{t("commission.commission_deduction")}
											</SelectItem>
										</SelectContent>
									</Select>
								)}
							/>
						</div>
						<div className="space-y-2">
							<Label>{t("commission.pay_amount")}</Label>
							<Input
								type="number"
								{...payForm.register("amount", { valueAsNumber: true })}
							/>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={payMutation.isPending}
						>
							{payMutation.isPending
								? t("common.processing")
								: t("commission.confirm_payment")}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
