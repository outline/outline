import { createFileRoute as cfr } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CommissionReport } from "@/domain/accounting/components/CommissionReport/CommissionReport";
import { APP_CONFIG } from "@/lib/constants";
import { i18n } from "@/shared/i18n/i18n.config";
import { PageHeader } from "@/ui";

export const Route = cfr("/_authenticated/accounting/commissions")({
	head: () => ({
		meta: [
			{
				title: `${i18n.t("accounting.commissions_report_title")} — ${APP_CONFIG.name}`,
			},
			{
				name: "description",
				content: i18n.t("accounting.commissions_report_desc"),
			},
		],
	}),
	component: AccountingCommissionsPage,
});

function AccountingCommissionsPage() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				description={t("accounting.commissions_subtitle")}
				title={t("accounting.commissions_header")}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					<CommissionReport />
				</div>
			</div>
		</div>
	);
}
