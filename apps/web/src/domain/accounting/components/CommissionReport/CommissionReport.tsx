import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CheckCircleLinear as CheckCircle,
	WalletMoneyLinear as Wallet,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getCommissionReportData } from "@/lib/api/accounting.functions";
import { useLanguage } from "@/shared/i18n";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { EmptyState, StatusBadge } from "@/ui";

export function CommissionReport() {
	const { t } = useTranslation();
	const { language } = useLanguage();
	const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
	const [statusFilter, setStatusFilter] = useState("all");

	const { data: records = [] } = useQuery({
		queryKey: ["commissionReport", month],
		queryFn: () => getCommissionReportData({}),
	});

	const filteredData = records.filter(
		(item: {
			status: string;
			date: string | Date;
			staffId: string;
			staffName: string;
			service: string;
			amount: number;
		}) => {
			if (statusFilter !== "all" && item.status !== statusFilter) return false;
			const dateStr =
				typeof item.date === "string" ? item.date : item.date.toISOString();
			return dateStr.startsWith(month);
		},
	);

	const totalPending = filteredData
		.filter((i) => i.status === "pending")
		.reduce((sum, item) => sum + item.amount, 0);

	return (
		<div className="space-y-6">
			{/* Filters */}
			<div className="bg-white border border-neutral-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-end sm:items-center gap-4">
				<div className="space-y-1.5 flex-1 w-full sm:w-auto">
					<label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
						{t("attendance.period_month")}
					</label>
					<Input
						type="month"
						value={month}
						onChange={(e) => setMonth(e.target.value)}
						className="rounded-lg"
					/>
				</div>
				<div className="space-y-1.5 flex-1 w-full sm:w-auto">
					<label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
						{t("common.status")}
					</label>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="rounded-lg bg-white">
							<SelectValue placeholder={t("commission.all_status")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("commission.all_status")}</SelectItem>
							<SelectItem value="pending">
								{t("commission.pending_status")}
							</SelectItem>
							<SelectItem value="paid">
								{t("commission.paid_status")}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex-none">
					<Button className="rounded-xl px-6 h-10 w-full sm:w-auto">
						{t("attendance.apply_filter")}
					</Button>
				</div>
			</div>

			{/* Summary Widgets */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="bg-white rounded-xl border border-neutral-200 p-6 flex items-center gap-4">
					<div className="h-12 w-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
						<Wallet className="w-6 h-6" />
					</div>
					<div>
						<p className="text-sm font-medium text-neutral-500">
							{t("commission.total_pending")}
						</p>
						<p className="text-2xl font-bold text-neutral-900 mt-1">
							{formatCurrency(totalPending, language)}
						</p>
					</div>
				</div>
				<div className="bg-white rounded-xl border border-neutral-200 p-6 flex items-center justify-between gap-4">
					<div>
						<h3 className="text-base font-bold text-neutral-900">
							{t("commission.bulk_payment")}
						</h3>
						<p className="text-sm text-neutral-500 mt-1">
							{t("commission.bulk_payment_desc")}
						</p>
					</div>
					<Button
						disabled={totalPending === 0}
						className="rounded-xl whitespace-nowrap"
					>
						<CheckCircle className="w-4 h-4 mr-2" /> {t("commission.pay_all")}
					</Button>
				</div>
			</div>

			{/* Data Table */}
			<div className="bg-white border border-neutral-200/80 rounded-xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="border-b border-neutral-200/80 bg-neutral-50/50">
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
									{t("common.date")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
									{t("attendance.staff_name")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
									{t("commission.service_label")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right">
									{t("commission.title")}
								</th>
								<th className="py-3 px-6 text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-center">
									{t("common.status")}
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-100">
							{filteredData.length === 0 ? (
								<tr>
									<td colSpan={5} className="py-12">
										<EmptyState
											title={t("commission.no_commission_title")}
											description={t("commission.no_commission_desc")}
											icon={Wallet}
										/>
									</td>
								</tr>
							) : (
								filteredData.map((item, index) => (
									<tr
										key={`${item.staffId}-${index}`}
										className="hover:bg-neutral-50/50 transition-colors"
									>
										<td className="py-4 px-6 text-[13px] text-neutral-600">
											{formatDate(item.date, language, { dateStyle: "medium" })}
										</td>
										<td className="py-4 px-6 text-[13px] font-bold text-neutral-900">
											{item.staffName}
										</td>
										<td className="py-4 px-6 text-[13px] text-neutral-600">
											{item.service}
										</td>
										<td className="py-4 px-6 text-[13px] font-mono font-medium text-neutral-900 text-right">
											{formatCurrency(item.amount, language)}
										</td>
										<td className="py-4 px-6 text-center">
											<StatusBadge
												type={item.status === "paid" ? "success" : "warning"}
												label={
													item.status === "paid"
														? t("commission.paid_status")
														: t("commission.pending_status")
												}
											/>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
