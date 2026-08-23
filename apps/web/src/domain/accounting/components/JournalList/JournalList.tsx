import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as dateLocales from "date-fns/locale";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	DocumentTextLinear as DocumentIcon,
	MagniferLinear as SearchIcon,
} from "solar-icon-set";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { accountingApi } from "@/lib/api/accounting.functions";
import { formatCurrency } from "@/shared/utils/format";
import { EmptyState, Table, TableCell, TableRow } from "@/ui";
import { TablePagination } from "@/ui/table/table-pagination";

export function JournalList() {
	const { t, i18n } = useTranslation();
	const currentLang = i18n.language as "id" | "en" | "jv" | "bjn";
	const dateLocale =
		currentLang === "id"
			? dateLocales.id
			: currentLang === "en"
				? dateLocales.enUS
				: currentLang === "jv"
					? dateLocales.id
					: dateLocales.id;

	const [searchTerm, setSearchTerm] = useState("");
	const [dateFilter, setDateFilter] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["journalEntries"],
		queryFn: () => accountingApi.getJournalEntries(),
	});

	const filteredEntries = (data?.entries || []).filter((entry) => {
		const matchSearch =
			searchTerm === "" ||
			entry.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
			entry.description?.toLowerCase().includes(searchTerm.toLowerCase());
		const matchDate =
			dateFilter === "" || entry.entryDate.toString().startsWith(dateFilter);
		return matchSearch && matchDate;
	});

	const { paginatedData, ...pagination } = usePagination(filteredEntries);

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-24 w-full rounded-lg" />
				))}
			</div>
		);
	}

	const entries = data?.entries || [];

	if (entries.length === 0) {
		return (
			<EmptyState
				icon={DocumentIcon}
				title={t("accounting.no_journal_title")}
				description={t("accounting.no_journal_desc")}
				className="bg-white border-neutral-100 "
			/>
		);
	}

	const HEADERS = [
		t("accounting.date_no"),
		t("accounting.account"),
		<div key="debit" className="text-right">
			{t("accounting.debit")}
		</div>,
		<div key="kredit" className="text-right">
			{t("accounting.credit")}
		</div>,
	];

	return (
		<div className="space-y-6">
			{/* Filters */}
			<div className="bg-white border border-neutral-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
				<div className="relative flex-1">
					<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
					<Input
						placeholder={t("accounting.journal_search_placeholder")}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-9 rounded-lg"
					/>
				</div>
				<div className="w-full sm:w-48">
					<Input
						type="date"
						value={dateFilter}
						onChange={(e) => setDateFilter(e.target.value)}
						className="rounded-lg text-neutral-600"
					/>
				</div>
			</div>

			<Table headers={HEADERS}>
				{paginatedData.map((entry) => (
					<TableRow key={entry.id} className="align-top">
						<TableCell className="w-[200px]">
							<div className="flex flex-col gap-1">
								<span className="text-[12px] text-neutral-900 font-medium whitespace-nowrap">
									{format(new Date(entry.entryDate), "dd MMM yyyy", {
										locale: dateLocale,
									})}
								</span>
								<span className="text-[10px] text-neutral-500 font-mono">
									{entry.id.split("-")[0]?.toUpperCase()}
								</span>
							</div>
							{entry.description && (
								<p className="text-[11px] text-neutral-500 mt-2 italic leading-relaxed">
									"{entry.description}"
								</p>
							)}
						</TableCell>
						<TableCell className="p-0 border-r border-neutral-100">
							{entry.lines.map((line, idx) => (
								<div
									key={line.id}
									className={`px-4 py-3 border-b border-neutral-100 last:border-b-0 flex flex-col gap-0.5 ${
										idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
									}`}
								>
									<div className="flex items-center gap-2">
										<span className="text-[12px] font-medium text-neutral-900">
											{line.account?.code || line.accountId}
										</span>
										<span className="text-[12px] text-neutral-600 truncate max-w-[180px]">
											{line.account?.name || ""}
										</span>
									</div>
									{line.description && (
										<span className="text-[10px] text-neutral-400 truncate max-w-[200px]">
											{line.description}
										</span>
									)}
								</div>
							))}
						</TableCell>
						<TableCell className="p-0 border-r border-neutral-100 align-top w-[140px]">
							{entry.lines.map((line, idx) => (
								<div
									key={`${line.id}-debit`}
									className={`px-4 py-3 h-[60px] flex items-center justify-end border-b border-neutral-100 last:border-b-0 ${
										idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
									}`}
								>
									{line.debit > 0 ? (
										<span className="text-[12px] font-medium text-neutral-900">
											{formatCurrency(line.debit, currentLang)}
										</span>
									) : (
										<span className="text-[12px] text-neutral-300">-</span>
									)}
								</div>
							))}
						</TableCell>
						<TableCell className="p-0 align-top w-[140px]">
							{entry.lines.map((line, idx) => (
								<div
									key={`${line.id}-kredit`}
									className={`px-4 py-3 h-[60px] flex items-center justify-end border-b border-neutral-100 last:border-b-0 ${
										idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
									}`}
								>
									{line.credit > 0 ? (
										<span className="text-[12px] font-medium text-neutral-900">
											{formatCurrency(line.credit, currentLang)}
										</span>
									) : (
										<span className="text-[12px] text-neutral-300">-</span>
									)}
								</div>
							))}
						</TableCell>
					</TableRow>
				))}
			</Table>
			{entries.length > 0 && <TablePagination {...pagination} />}
		</div>
	);
}
