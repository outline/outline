import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SettingsLinear as SettingsIcon } from "solar-icon-set";
import { BusinessSection } from "@/domain/identity/components/Settings/BusinessSection";
import { APP_CONFIG } from "@/lib/constants";
import { useSession } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/settings/")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("settings_page.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("settings_page.description"),
			},
		],
	}),
	component: SettingsPage,
});

function SettingsPage() {
	const { session, isLoading } = useSession();
	const { t } = useTranslation();

	if (isLoading) return null;

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500">
			<PageHeader
				title={t("nav.business_info")}
				description={t("settings_page.description")}
			/>

			<div className="p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-8 flex-1">
				<BusinessSection session={session} />

				{/* Application Info */}
				<section className="pt-8 text-center">
					<div className="inline-flex items-center gap-2 text-[12px] text-neutral-400">
						<SettingsIcon className="w-3.5 h-3.5" />
						<span>
							{t("settings.version")} {APP_CONFIG.version}
						</span>
						<span className="w-1 h-1 rounded-full bg-neutral-300" />
						<span>{APP_CONFIG.copyright}</span>
					</div>
				</section>
			</div>
		</div>
	);
}
