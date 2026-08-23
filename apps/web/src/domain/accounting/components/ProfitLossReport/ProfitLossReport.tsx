import { useQuery } from "@tanstack/react-query";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DocumentTextLinear as FileTextIcon } from "solar-icon-set";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { accountingApi } from "@/lib/api/accounting.functions";
import { formatCurrency, formatDate } from "@/shared/utils/format";
import { EmptyState, Table, TableCell, TableRow } from "@/ui";

export function ProfitLossReport() {
	const { t, i18n } = useTranslation();
	const currentLang = i18n.language as "id" | "en" | "jv" | "bjn";
	const [startDate, setStartDate] = useState(
		new Date(new Date().getFullYear(), new Date().getMonth(), 1)
			.toISOString()
			.split("T")[0],
	);
	const [endDate, setEndDate] = useState(
		new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
			.toISOString()
			.split("T")[0],
	);

	const { data, isLoading } = useQuery({
		queryKey: ["profitLoss", startDate, endDate],
		queryFn: () =>
			accountingApi.getProfitLossReport({
				data: { startDate, endDate },
			}),
	});

	return (
		<div className="space-y-6">
			{/* Filter Bar */}
			<div className="bg-white border border-neutral-200/80 rounded-lg p-4 flex flex-col sm:flex-row items-end sm:items-center gap-4">
				<div className="space-y-1.5 flex-1 w-full sm:w-auto">
					<label
						htmlFor="startDate"
						className="text-xs font-semibold text-neutral-500 uppercase tracking-wider"
					>
						{t("common.start_date", "Tanggal Mulai")}
					</label>
					<Input
						id="startDate"
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
					/>
				</div>
				<div className="space-y-1.5 flex-1 w-full sm:w-auto">
					<label
						htmlFor="endDate"
						className="text-xs font-semibold text-neutral-500 uppercase tracking-wider"
					>
						{t("common.end_date", "Tanggal Selesai")}
					</label>
					<Input
						id="endDate"
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
					/>
				</div>
			</div>

			{/* Report Content */}
			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-40 w-full rounded-lg" />
					<Skeleton className="h-40 w-full rounded-lg" />
				</div>
			) : !data ||
				(data.revenues.length === 0 && data.expenses.length === 0) ? (
				<EmptyState
					icon={FileTextIcon}
					title={t("accounting.no_transaction_data")}
					description={t("accounting.no_transaction_desc")}
					className="bg-white border-neutral-100 "
				/>
			) : (
				<div className="bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
					{/* Header */}
					<div className="bg-neutral-50/80 border-b border-neutral-200/80 p-5 text-center">
						<h3 className="text-lg font-semibold text-neutral-900">
							{t("accounting.report_title")}
						</h3>
						<p className="text-sm text-neutral-500 mt-1">
							{t("accounting.period_label")}:{" "}
							{startDate ? formatDate(startDate, currentLang) : "-"} —{" "}
							{endDate ? formatDate(endDate, currentLang) : "-"}
						</p>
					</div>
					<Table flat>
						{/* PENDAPATAN */}
						<TableRow className="bg-neutral-50/50">
							<TableCell
								className="font-semibold text-sm text-neutral-900"
								colSpan={2}
							>
								{t("accounting.revenue_header")}
							</TableCell>
						</TableRow>
						{data.revenues.map((rev, idx) => (
							<TableRow key={idx} className="border-b border-neutral-100">
								<TableCell className="text-sm text-neutral-600 pl-10">
									{rev.category}
								</TableCell>
								<TableCell className="text-sm text-neutral-900 font-mono text-right w-48">
									{formatCurrency(rev.amount, currentLang)}
								</TableCell>
							</TableRow>
						))}
						<TableRow className="border-b-2 border-neutral-200">
							<TableCell className="font-semibold text-sm text-neutral-900 text-right">
								{t("accounting.total_revenue")}
							</TableCell>
							<TableCell className="font-bold text-sm text-neutral-900 font-mono text-right bg-emerald-50/50 text-emerald-700">
								{formatCurrency(data.totalRevenue, currentLang)}
							</TableCell>
						</TableRow>

						{/* PENGELUARAN */}
						<TableRow className="bg-neutral-50/50">
							<TableCell
								className="font-semibold text-sm text-neutral-900"
								colSpan={2}
							>
								{t("accounting.expense_header")}
							</TableCell>
						</TableRow>
						{data.expenses.map((exp, idx) => (
							<TableRow key={idx} className="border-b border-neutral-100">
								<TableCell className="text-sm text-neutral-600 pl-10">
									{exp.category}
								</TableCell>
								<TableCell className="text-sm text-neutral-900 font-mono text-right w-48">
									{formatCurrency(exp.amount, currentLang)}
								</TableCell>
							</TableRow>
						))}
						<TableRow className="border-b-2 border-neutral-200">
							<TableCell className="font-semibold text-sm text-neutral-900 text-right">
								{t("accounting.total_expense")}
							</TableCell>
							<TableCell className="font-bold text-sm text-neutral-900 font-mono text-right bg-rose-50/50 text-rose-700">
								{formatCurrency(data.totalExpense, currentLang)}
							</TableCell>
						</TableRow>

						{/* LABA BERSIH */}
						<TableRow className="bg-neutral-50/80">
							<TableCell className="font-bold text-base text-neutral-900 text-right uppercase tracking-wider">
								{t("accounting.net_profit")}
							</TableCell>
							<TableCell
								className={`font-bold text-base font-mono text-right ${
									data.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
								}`}
							>
								{formatCurrency(data.netProfit, currentLang)}
							</TableCell>
						</TableRow>
					</Table>
				</div>
			)}
		</div>
	);
}
