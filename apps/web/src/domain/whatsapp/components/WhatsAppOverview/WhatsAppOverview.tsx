import { useTranslation } from "react-i18next";
import {
	DangerCircleBoldDuotone as FailedIcon,
	CalendarBoldDuotone as MonthIcon,
	ClockCircleBoldDuotone as ScheduledIcon,
	CheckCircleBoldDuotone as TotalIcon,
} from "solar-icon-set";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCard, DashboardMetric, DashboardMetricGroup } from "@/ui";

export type TWhatsAppOverviewProps = {
	readonly stats?: {
		readonly total: number;
		readonly thisMonth: number;
		readonly scheduled: number;
		readonly failed: number;
	} | null;
};

export const WhatsAppOverview = ({ stats }: TWhatsAppOverviewProps) => {
	const { t } = useTranslation();

	if (!stats) {
		return (
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{[1, 2, 3, 4].map((i) => (
					<Skeleton key={i} className="h-24 rounded-lg" />
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			<DashboardCard title={t("whatsapp.total_sent")} icon={TotalIcon}>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("whatsapp.total")}
						value={stats.total}
						valueClassName="text-emerald-600"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard title={t("whatsapp.this_month")} icon={MonthIcon}>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("whatsapp.this_month")}
						value={stats.thisMonth}
						valueClassName="text-blue-600"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard title={t("whatsapp.scheduled")} icon={ScheduledIcon}>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("whatsapp.scheduled")}
						value={stats.scheduled}
						valueClassName="text-amber-500"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
			<DashboardCard title={t("whatsapp.failed")} icon={FailedIcon}>
				<DashboardMetricGroup>
					<DashboardMetric
						label={t("whatsapp.failed")}
						value={stats.failed}
						valueClassName="text-rose-600"
					/>
				</DashboardMetricGroup>
			</DashboardCard>
		</div>
	);
};
