import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FinancialSummaryGrid, RevenueTrendChart } from "@/domain/accounting";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import { accountingApi } from "@/lib/api/accounting.functions";
import { APP_CONFIG } from "@/lib/constants";
import { generatePDFReport } from "@/lib/report.functions";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatCurrency, formatDate } from "@/shared/utils";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/accounting/")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({
		meta: [
			{ title: `${i18n.t("accounting.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("accounting.meta_description"),
			},
		],
	}),
	component: AccountingPage,
});

function AccountingPage() {
	const { t } = useTranslation();

	const { data: summary, isLoading } = useQuery({
		queryKey: ["financialSummary"],
		queryFn: () => accountingApi.getFinancialSummary(),
	});

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full">
			<PageHeader
				title={t("accounting.title")}
				description={t("accounting.index_subtitle")}
				docHref="/docs/accounting"
				onReport={() => {
					if (!summary) return;
					generatePDFReport({
						title: t("accounting.report_title"),
						businessName: APP_CONFIG.name,
						date: formatDate(new Date(), "id"),
						sections: [
							{
								title: t("accounting.financial_position"),
								items: [
									{
										label: t("accounting.total_revenue_month"),
										value: formatCurrency(summary.monthlyRevenue || 0, "id"),
									},
									{
										label: t("accounting.total_expenses_month"),
										value: formatCurrency(summary.monthlyExpenses || 0, "id"),
									},
									{
										label: t("accounting.net_profit"),
										value: formatCurrency(summary.monthlyProfit || 0, "id"),
									},
								],
							},
						],
					});
				}}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					<div className="space-y-10">
						<FinancialSummaryGrid summary={summary} isLoading={isLoading} />
						{summary?.revenueTrend && (
							<RevenueTrendChart trend={summary.revenueTrend} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
