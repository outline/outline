import { useTranslation } from "react-i18next";
import {
	ChartBoldDuotone as ChartIcon,
	UsersGroupTwoRoundedBoldDuotone as CustomersIcon,
	InfoCircleLinear as InfoIcon,
	Card2BoldDuotone as SalesIcon,
} from "solar-icon-set";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TDashboardMetrics } from "@/domain/accounting";
import { useLanguage } from "@/shared/i18n";
import { formatCurrency, formatNumber } from "@/shared/utils/format";
import {
	DashboardCard,
	DashboardMetric,
	DashboardMetricGroup,
	Sparkline,
} from "@/ui";

export type TMetricGridProps = {
	readonly metrics?: TDashboardMetrics | null | undefined;
	readonly isLoading: boolean;
};

const formatGrowth = (value: number): string => {
	const sign = value >= 0 ? "+" : "";
	return `${sign}${value.toFixed(1)}%`;
};

export const MetricGrid = ({ metrics, isLoading }: TMetricGridProps) => {
	const { language } = useLanguage();
	const { t } = useTranslation();

	const revenueValue = isLoading
		? "-"
		: formatCurrency(metrics?.revenueToday || 0, language);
	const transactionsValue = isLoading
		? "-"
		: formatNumber(metrics?.transactionsToday || 0, language);
	const customersValue = isLoading
		? "-"
		: formatNumber(metrics?.totalCustomers || 0, language);

	return (
		<TooltipProvider>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Card 1: Sales */}
				<DashboardCard
					title={t("dashboard.sales", "Sales")}
					icon={SalesIcon}
					headerAction={
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="cursor-help">
									<InfoIcon className="w-3.5 h-3.5 text-neutral-300 hover:text-neutral-600 transition-colors" />
								</div>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{t(
										"dashboard.sales_tooltip",
										"Statistik pendapatan dan transaksi hari ini.",
									)}
								</p>
							</TooltipContent>
						</Tooltip>
					}
				>
					<DashboardMetricGroup
						aside={
							<Sparkline color="#10b981" className="w-24 h-12 flex-shrink-0" />
						}
					>
						<DashboardMetric
							label={t("dashboard.daily_revenue", "Daily Revenue")}
							value={revenueValue}
							trend={{
								value: metrics ? formatGrowth(metrics.revenueGrowth) : "0%",
								status:
									metrics && metrics.revenueGrowth >= 0
										? "positive"
										: "negative",
							}}
						/>
						<DashboardMetric
							label={t("dashboard.transactions", "Transactions")}
							value={transactionsValue}
							trend={{
								value: metrics
									? formatGrowth(metrics.transactionsGrowth)
									: "0%",
								status:
									metrics && metrics.transactionsGrowth >= 0
										? "positive"
										: "negative",
							}}
						/>
					</DashboardMetricGroup>
				</DashboardCard>

				{/* Card 2: Operations */}
				<DashboardCard
					title={t("dashboard.performance", "Performance")}
					icon={ChartIcon}
					headerAction={
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="cursor-help">
									<InfoIcon className="w-3.5 h-3.5 text-neutral-300 hover:text-neutral-600 transition-colors" />
								</div>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{t(
										"dashboard.performance_tooltip",
										"Tingkat hunian dan status boarding aktif.",
									)}
								</p>
							</TooltipContent>
						</Tooltip>
					}
				>
					<DashboardMetricGroup
						aside={
							<Sparkline color="#3b82f6" className="w-24 h-12 flex-shrink-0" />
						}
					>
						<DashboardMetric
							label={t("dashboard.completed_month", "Completed This Month")}
							value={isLoading ? "-" : `${metrics?.completedMonth || 0}`}
						/>
						<DashboardMetric
							label={t("dashboard.active_boardings", "Active Boardings")}
							value={`${metrics?.activeBoardings || 0} ${t("dashboard.pets", "pets")}`}
						/>
					</DashboardMetricGroup>
				</DashboardCard>

				{/* Card 3: Customers */}
				<DashboardCard
					title={t("dashboard.customers", "Customers")}
					icon={CustomersIcon}
					headerAction={
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="cursor-help">
									<InfoIcon className="w-3.5 h-3.5 text-neutral-300 hover:text-neutral-600 transition-colors" />
								</div>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p className="text-xs">
									{t(
										"dashboard.customers_tooltip",
										"Total pelanggan terdaftar dan low stock products.",
									)}
								</p>
							</TooltipContent>
						</Tooltip>
					}
				>
					<DashboardMetricGroup
						aside={
							<Sparkline color="#f59e0b" className="w-24 h-12 flex-shrink-0" />
						}
					>
						<DashboardMetric
							label={t("dashboard.total_customers", "Total Customers")}
							value={customersValue}
						/>
						<DashboardMetric
							label={t("dashboard.low_stock", "Low Stock")}
							value={isLoading ? "-" : `${metrics?.lowStockProducts || 0}`}
						/>
					</DashboardMetricGroup>
				</DashboardCard>
			</div>
		</TooltipProvider>
	);
};
