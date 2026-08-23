import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	ArrowRightDownLinear as ExpenseIcon,
	ArrowRightUpLinear as IncomeIcon,
	WalletMoneyLinear as WalletIcon,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { accountingApi } from "@/lib/api/accounting.functions";
import { formatCurrency } from "@/shared/utils/format";
import { Table, TableCell, TableRow } from "@/ui";

export function CashFlowReport() {
	const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));

	const { data, isLoading } = useQuery({
		queryKey: ["cashFlowReport"],
		queryFn: () => accountingApi.getCashFlowReport(),
	});

	const inflows = data?.inflows ?? [];
	const outflows = data?.outflows ?? [];
	const totalInflow = data?.totalInflow || 0;
	const totalOutflow = data?.totalOutflow || 0;
	const netCashFlow = data?.netCashFlow || 0;

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* Filters */}
			<div className="bg-white border border-neutral-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-end sm:items-center gap-4">
				<div className="space-y-1.5 flex-1 w-full sm:w-auto">
					<label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
						Periode Bulan
					</label>
					<Input
						type="month"
						value={month}
						onChange={(e) => setMonth(e.target.value)}
						className="rounded-lg"
					/>
				</div>
				<div className="flex-none">
					<Button className="rounded-xl px-6 h-10 w-full sm:w-auto">
						Terapkan Filter
					</Button>
				</div>
			</div>

			<div className="bg-white border border-neutral-200/80 rounded-xl overflow-hidden">
				<div className="bg-neutral-50/80 border-b border-neutral-200/80 p-5 text-center">
					<h3 className="text-lg font-semibold text-neutral-900">
						Laporan Arus Kas
					</h3>
					<p className="text-sm text-neutral-500 mt-1">Periode: {month}</p>
				</div>

				{isLoading ? (
					<div className="p-6 space-y-4">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-6 w-48 mt-6" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : (
					<Table flat>
						<TableRow className="bg-neutral-50/50">
							<TableCell
								className="font-semibold text-sm text-neutral-900 flex items-center gap-2"
								colSpan={2}
							>
								<IncomeIcon className="w-4 h-4 text-emerald-500" /> ARUS KAS
								MASUK
							</TableCell>
						</TableRow>
						{inflows.map((item, idx) => (
							<TableRow key={idx} className="border-b border-neutral-100">
								<TableCell className="text-sm text-neutral-600 pl-10">
									{item.category}
								</TableCell>
								<TableCell className="text-sm text-neutral-900 font-mono text-right w-48">
									{formatCurrency(item.amount)}
								</TableCell>
							</TableRow>
						))}
						<TableRow className="border-b-2 border-neutral-200">
							<TableCell className="font-semibold text-sm text-neutral-900 text-right">
								Total Kas Masuk
							</TableCell>
							<TableCell className="font-bold text-sm text-neutral-900 font-mono text-right bg-emerald-50/50 text-emerald-700">
								{formatCurrency(totalInflow)}
							</TableCell>
						</TableRow>

						<TableRow className="bg-neutral-50/50">
							<TableCell
								className="font-semibold text-sm text-neutral-900 flex items-center gap-2"
								colSpan={2}
							>
								<ExpenseIcon className="w-4 h-4 text-rose-500" /> ARUS KAS
								KELUAR
							</TableCell>
						</TableRow>
						{outflows.map((item, idx) => (
							<TableRow key={idx} className="border-b border-neutral-100">
								<TableCell className="text-sm text-neutral-600 pl-10">
									{item.category}
								</TableCell>
								<TableCell className="text-sm text-neutral-900 font-mono text-right w-48">
									{formatCurrency(item.amount)}
								</TableCell>
							</TableRow>
						))}
						<TableRow className="border-b-2 border-neutral-200">
							<TableCell className="font-semibold text-sm text-neutral-900 text-right">
								Total Kas Keluar
							</TableCell>
							<TableCell className="font-bold text-sm text-neutral-900 font-mono text-right bg-rose-50/50 text-rose-700">
								{formatCurrency(totalOutflow)}
							</TableCell>
						</TableRow>

						<TableRow className="bg-neutral-50/80">
							<TableCell className="font-bold text-base text-neutral-900 text-right flex items-center justify-end gap-2 uppercase tracking-wider">
								<WalletIcon className="w-5 h-5 text-neutral-400" /> Kenaikan
								(Penurunan) Kas Bersih
							</TableCell>
							<TableCell
								className={`font-bold text-base font-mono text-right ${
									netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"
								}`}
							>
								{formatCurrency(netCashFlow)}
							</TableCell>
						</TableRow>
					</Table>
				)}
			</div>
		</div>
	);
}
