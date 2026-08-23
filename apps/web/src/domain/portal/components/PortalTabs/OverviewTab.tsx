import { useTranslation } from "react-i18next";
import {
	CalendarBoldDuotone as CalendarIcon,
	CatBoldDuotone as PetsIcon,
	StarBoldDuotone as StarFillIcon,
	StarLinear as StarIcon,
	WidgetBoldDuotone as WidgetIcon,
} from "solar-icon-set";
import { Skeleton } from "@/components/ui/skeleton";
import type { PortalStatsData } from "@/lib/types";
import { DashboardCard, DashboardMetric, DashboardMetricGroup } from "@/ui";

export type TOverviewTabProps = {
	readonly stats: PortalStatsData | null | undefined;
};

export function OverviewTab({ stats }: TOverviewTabProps) {
	const { t } = useTranslation();
	if (!stats) {
		return <Skeleton className="h-40 w-full rounded-lg" />;
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			<DashboardCard title={t("portal.reviews")} icon={CalendarIcon}>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("portal.reviews")}
						value={stats.totalReviews}
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard title={t("portal.avg_rating")} icon={StarFillIcon}>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("portal.avg_rating")}
						value={
							<div className="flex items-center gap-1">
								{stats.averageRating}
								<StarIcon className="w-5 h-5 text-amber-500" />
							</div>
						}
						valueClassName="text-amber-500"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard title={t("portal.active_services")} icon={WidgetIcon}>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("portal.active_services")}
						value={stats.totalServices}
						valueClassName="text-blue-600"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard title={t("common.pets")} icon={PetsIcon}>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("common.pets")}
						value={stats.totalPets}
						valueClassName="text-emerald-600"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
		</div>
	);
}
