import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as dateLocales from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { BillLinear as BillIcon } from "solar-icon-set";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { accountingApi } from "@/lib/api/accounting.functions";
import { formatCurrency } from "@/shared/utils/format";
import { EmptyState, Table, TableCell, TableRow } from "@/ui";
import { TablePagination } from "@/ui/table/table-pagination";

export function PettyCashList() {
	const { t, i18n } = useTranslation();
	const currentLang = i18n.language as "id" | "en" | "jv" | "bjn";
	const dateLocale =
		currentLang === "id"
			? dateLocales.id
			: currentLang === "en"
				? dateLocales.enUS
				: currentLang === "jv"
					? dateLocales.id
					: // Default to ID for local languages if not available
						dateLocales.id;

	const { data, isLoading } = useQuery({
		queryKey: ["pettyCash"],
		queryFn: () => accountingApi.getPettyCashTransactions(),
	});

	const { paginatedData, ...pagination } = usePagination(
		data?.transactions || [],
	);

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-16 w-full rounded-lg" />
				))}
			</div>
		);
	}

	const transactions = data?.transactions || [];

	if (transactions.length === 0) {
		return (
			<EmptyState
				icon={BillIcon}
				title={t("accounting.no_pettycash_title")}
				description={t("accounting.no_pettycash_desc")}
				className="bg-white border-neutral-100 "
			/>
		);
	}

	const HEADERS = [
		t("common.date"),
		t("common.description"),
		t("accounting.trans_type"),
		<div key="nominal" className="text-right">
			{t("common.amount")}
		</div>,
	];

	return (
		<>
			<Table headers={HEADERS}>
				{paginatedData.map((transaction) => (
					<TableRow key={transaction.id}>
						<TableCell>
							{format(new Date(transaction.transactionDate), "dd MMM yyyy", {
								locale: dateLocale,
							})}
						</TableCell>
						<TableCell>
							<div className="font-medium text-neutral-900">
								{transaction.description}
							</div>
						</TableCell>
						<TableCell>
							<Badge
								variant={transaction.type === "in" ? "default" : "secondary"}
							>
								{transaction.type === "in"
									? t("accounting.cash_in")
									: t("accounting.cash_out")}
							</Badge>
						</TableCell>
						<TableCell align="right" className="font-medium">
							<span
								className={
									transaction.type === "in"
										? "text-emerald-600"
										: "text-neutral-900"
								}
							>
								{transaction.type === "in" ? "+" : "-"}
								{formatCurrency(transaction.amount, currentLang)}
							</span>
						</TableCell>
					</TableRow>
				))}
			</Table>
			{transactions.length > 0 && <TablePagination {...pagination} />}
		</>
	);
}
