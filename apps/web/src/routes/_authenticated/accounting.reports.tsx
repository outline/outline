import { createFileRoute as cfr } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	AnimatedTabs as Tabs,
	AnimatedTabsContent as TabsContent,
	AnimatedTabsList as TabsList,
	AnimatedTabsTrigger as TabsTrigger,
} from "@/components/ui/tabs";
import {
	CashFlowReport,
	ProfitLossReport,
	RevenueTrendChart,
} from "@/domain/accounting";
import { APP_CONFIG } from "@/lib/constants";
import { generatePDFReport } from "@/lib/report.functions";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatDate } from "@/shared/utils";
import { PageHeader } from "@/ui";

export const Route = cfr("/_authenticated/accounting/reports")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("accounting.reports_title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("accounting.reports_subtitle"),
			},
		],
	}),
	component: AccountingReportsPage,
});

function AccountingReportsPage() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				description={t("accounting.reports_subtitle")}
				docHref="/docs/accounting"
				onReport={() => {
					generatePDFReport({
						title: t("accounting.financial_statement_report"),
						businessName: APP_CONFIG.name,
						date: formatDate(new Date(), "id"),
						sections: [
							{
								title: t("accounting.financial_overview"),
								items: [
									{
										label: t("accounting.report_type"),
										value: t("accounting.profit_loss"),
									},
									{
										label: t("accounting.period"),
										value: t("accounting.current_month"),
									},
								],
							},
						],
					});
				}}
				title={t("accounting.reports_tab")}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					<Tabs defaultValue="pl" className="w-full">
						<div className="bg-neutral-50/50 p-1.5 rounded-xl border border-neutral-200 inline-block mb-6">
							<TabsList className="bg-transparent space-x-1">
								<TabsTrigger
									value="pl"
									className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6"
								>
									{t("accounting.profit_loss")}
								</TabsTrigger>
								<TabsTrigger
									value="cashflow"
									className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6"
								>
									{t("accounting.cash_flow")}
								</TabsTrigger>
								<TabsTrigger
									value="trend"
									className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm px-6"
								>
									{t("accounting.revenue_trend_tab")}
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="pl" className="focus-visible:outline-none">
							<ProfitLossReport />
						</TabsContent>

						<TabsContent
							value="cashflow"
							className="focus-visible:outline-none mt-4"
						>
							<CashFlowReport />
						</TabsContent>

						<TabsContent
							value="trend"
							className="focus-visible:outline-none mt-4"
						>
							<RevenueTrendChart trend={[]} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
