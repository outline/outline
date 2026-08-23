import { useTranslation } from "react-i18next";
import {
	Banknote2BoldDuotone as BanknoteIcon,
	CartLargeBoldDuotone as CartIcon,
	ChartBoldDuotone as ChartIcon,
	Card2BoldDuotone as WalletIcon,
} from "solar-icon-set";
import { Skeleton } from "@/components/ui/skeleton";
import type { TFinancialSummary } from "@/domain/accounting";
import { formatCurrency } from "@/shared/utils/format";
import { DashboardCard, DashboardMetric, DashboardMetricGroup } from "@/ui";
export type TFinancialSummaryGridProps = {
	readonly summary?: TFinancialSummary | null | undefined;
	readonly isLoading: boolean;
};

export const FinancialSummaryGrid = ({
	summary,
	isLoading,
}: TFinancialSummaryGridProps) => {
	const { t, i18n } = useTranslation();
	const currentLang = i18n.language as "id" | "en" | "jv" | "bjn";

	if (isLoading || !summary) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-24 rounded-lg" />
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
			<DashboardCard
				title={t("accounting.monthly_revenue_title")}
				icon={WalletIcon}
			>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("accounting.revenue_label")}
						value={formatCurrency(summary.monthlyRevenue, currentLang)}
						valueClassName="text-emerald-600"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard
				title={t("accounting.monthly_expense_title")}
				icon={CartIcon}
			>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("accounting.expense_label")}
						value={formatCurrency(summary.monthlyExpenses, currentLang)}
						valueClassName="text-rose-600"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard
				title={t("accounting.monthly_profit_title")}
				icon={ChartIcon}
			>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("accounting.profit_label")}
						value={formatCurrency(summary.monthlyProfit, currentLang)}
						valueClassName={
							summary.monthlyProfit >= 0 ? "text-emerald-600" : "text-rose-600"
						}
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard
				title={t("accounting.petty_cash_balance")}
				icon={BanknoteIcon}
			>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("accounting.balance_label")}
						value={formatCurrency(summary.pettyCashBalance, currentLang)}
					/>
				</DashboardMetricGroup>
			</DashboardCard>
		</div>
	);
};
