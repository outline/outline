import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { APP_CONFIG } from "@/lib/constants";
import { i18n } from "@/shared/i18n/i18n.config";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/profile")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("nav.profile")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("settings_page.description"),
			},
		],
	}),
	component: ProfileLayout,
});

function ProfileLayout() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("nav.profile")}
				description={t("profile_page.subtitle")}
			/>
			<div className="p-6 lg:p-8 flex-1 bg-white">
				<Outlet />
			</div>
		</div>
	);
}
