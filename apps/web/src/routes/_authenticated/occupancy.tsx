import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RoomOccupancyView } from "@/domain/boarding/components/BoardingCalendar/RoomOccupancyView";
import { APP_CONFIG } from "@/lib/constants";
import { i18n } from "@/shared/i18n/i18n.config";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/occupancy")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("nav.occupancy")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("boarding.occupancy_title"),
			},
		],
	}),
	component: OccupancyPage,
});

function OccupancyPage() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full bg-white">
			<PageHeader
				title={t("nav.occupancy")}
				description={t("boarding.occupancy_title")}
			/>
			<div className="p-6 lg:p-8 flex-1 overflow-y-auto">
				<div className="max-w-7xl mx-auto">
					<RoomOccupancyView />
				</div>
			</div>
		</div>
	);
}
