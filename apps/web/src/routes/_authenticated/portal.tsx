import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	CalendarBoldDuotone as CalendarIcon,
	ChartLinear as ChartIcon,
	GlobalLinear as PortalIcon,
	SettingsLinear as SettingsIcon,
	StarLinear as StarIcon,
} from "solar-icon-set";
import {
	AnimatedTabs,
	AnimatedTabsContent,
	AnimatedTabsList,
	AnimatedTabsTrigger,
} from "@/components/ui/tabs";
import { BookingsTab } from "@/domain/portal/components/PortalTabs/BookingsTab";
import { OverviewTab } from "@/domain/portal/components/PortalTabs/OverviewTab";
import { ReviewsTab } from "@/domain/portal/components/PortalTabs/ReviewsTab";
import { ServicesTab } from "@/domain/portal/components/PortalTabs/ServicesTab";
import { SettingsTab } from "@/domain/portal/components/PortalTabs/SettingsTab";
import { portalApi } from "@/lib/api/portal.functions";
import { APP_CONFIG } from "@/lib/constants";

import { i18n } from "@/shared/i18n/i18n.config";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/portal")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("portal_page.meta_title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("portal_page.meta_description"),
			},
		],
	}),
	component: PortalPage,
});

function PortalPage() {
	const { t } = useTranslation();

	const { data: stats } = useQuery({
		queryKey: ["portalStats"],
		queryFn: () => portalApi.getPortalStats(),
	});

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("portal.title")}
				description={t("portal.description")}
				docHref="/docs/dashboard"
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					<AnimatedTabs defaultValue="overview" indicator="pill">
						<AnimatedTabsList>
							<AnimatedTabsTrigger value="overview">
								<ChartIcon className="w-4 h-4" />
								{t("common.overview")}
							</AnimatedTabsTrigger>
							<AnimatedTabsTrigger value="bookings">
								<CalendarIcon className="w-4 h-4" />
								{t("nav.boardings")}
							</AnimatedTabsTrigger>
							<AnimatedTabsTrigger value="services">
								<PortalIcon className="w-4 h-4" />
								{t("portal.portal_services")}
							</AnimatedTabsTrigger>
							<AnimatedTabsTrigger value="reviews">
								<StarIcon className="w-4 h-4" />
								{t("portal.reviews")}
							</AnimatedTabsTrigger>
							<AnimatedTabsTrigger value="settings">
								<SettingsIcon className="w-4 h-4" />
								{t("nav.settings")}
							</AnimatedTabsTrigger>
						</AnimatedTabsList>

						<AnimatedTabsContent value="overview">
							<OverviewTab stats={stats} />
						</AnimatedTabsContent>
						<AnimatedTabsContent value="bookings">
							<BookingsTab />
						</AnimatedTabsContent>
						<AnimatedTabsContent value="services">
							<ServicesTab />
						</AnimatedTabsContent>
						<AnimatedTabsContent value="reviews">
							<ReviewsTab />
						</AnimatedTabsContent>
						<AnimatedTabsContent value="settings">
							<SettingsTab />
						</AnimatedTabsContent>
					</AnimatedTabs>
				</div>
			</div>
		</div>
	);
}
