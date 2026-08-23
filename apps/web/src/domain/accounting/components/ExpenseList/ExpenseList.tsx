import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as dateLocales from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { DocumentTextLinear as DocumentIcon } from "solar-icon-set";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/use-pagination";
import { accountingApi } from "@/lib/api/accounting.functions";
import { formatCurrency } from "@/shared/utils/format";
import { EmptyState, Table, TableCell, TableRow } from "@/ui";
import { TablePagination } from "@/ui/table/table-pagination";

export function ExpenseList() {
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

	const { data, isLoading } = useQuery({
		queryKey: ["expenses"],
		queryFn: () => accountingApi.getExpenses(),
	});

	const { paginatedData, ...pagination } = usePagination(data?.expenses || []);

	if (isLoading) {
		return (
			<div className="space-y-4">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-16 w-full rounded-lg" />
				))}
			</div>
		);
	}

	const expenses = data?.expenses || [];

	if (expenses.length === 0) {
		return (
			<EmptyState
				icon={DocumentIcon}
				title={t("accounting.no_expense_title")}
				description={t("accounting.no_expense_desc")}
				className="bg-white border-neutral-100 "
			/>
		);
	}

	const HEADERS = [
		t("common.date"),
		t("common.description"),
		t("accounting.category"),
		<div key="nominal" className="text-right">
			{t("common.amount")}
		</div>,
	];

	return (
		<>
			<Table headers={HEADERS}>
				{paginatedData.map((expense) => (
					<TableRow key={expense.id}>
						<TableCell>
							{format(new Date(expense.expenseDate), "dd MMM yyyy", {
								locale: dateLocale,
							})}
						</TableCell>
						<TableCell>
							<div className="flex flex-col gap-1">
								<span className="font-medium text-neutral-900">
									{expense.description}
								</span>
								<span className="text-[11px] text-neutral-500 font-mono">
									#{expense.id.split("-")[0]?.toUpperCase()}
								</span>
							</div>
						</TableCell>
						<TableCell>
							<Badge
								variant="outline"
								className="text-neutral-600 bg-neutral-50"
							>
								{expense.category}
							</Badge>
						</TableCell>
						<TableCell align="right">
							<span className="font-medium text-neutral-900">
								{formatCurrency(expense.amount, currentLang)}
							</span>
						</TableCell>
					</TableRow>
				))}
			</Table>
			{expenses.length > 0 && <TablePagination {...pagination} />}
		</>
	);
}
