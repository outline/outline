import { useQuery } from "@tanstack/react-query";
import { createFileRoute as cfr } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CreateJournalModal, JournalList } from "@/domain/accounting";
import { accountingApi } from "@/lib/api/accounting.functions";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { i18n } from "@/shared/i18n/i18n.config";
import { PageHeader } from "@/ui";

export const Route = cfr("/_authenticated/accounting/journal")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("accounting.journal_tab")} — ${APP_CONFIG.name}` },
			{ name: "description", content: i18n.t("accounting.journal_subtitle") },
		],
	}),
	component: AccountingJournalPage,
});

function AccountingJournalPage() {
	const { t } = useTranslation();
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	const { data } = useQuery({
		queryKey: ["journalEntries"],
		queryFn: () => accountingApi.getJournalEntries(),
	});

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				description={t("accounting.journal_subtitle")}
				docHref="/docs/accounting"
				onExport={() => exportToCSV(data?.entries || [], "journal-entries.csv")}
				title={t("accounting.journal_tab")}
				actions={
					<Button className="h-10 px-4" onClick={() => setIsCreateOpen(true)}>
						{t("accounting.add_journal")}
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					<JournalList />

					<CreateJournalModal
						isOpen={isCreateOpen}
						onClose={() => setIsCreateOpen(false)}
					/>
				</div>
			</div>
		</div>
	);
}
