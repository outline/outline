import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	CatBoldDuotone as Cat,
	HistoryBoldDuotone as HistoryIcon,
	MagniferBoldDuotone as SearchIcon,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TBoardingWithPetsDto } from "@/domain/boarding";
import { DashboardCard } from "@/ui";

export type TRecentBoardingsProps = {
	readonly boardings: readonly TBoardingWithPetsDto[];
	readonly isLoading: boolean;
	readonly className?: string;
};

export const RecentBoardings = ({
	boardings,
	isLoading,
	className,
}: TRecentBoardingsProps) => {
	const { t } = useTranslation();

	if (isLoading) {
		return (
			<DashboardCard title="Latest Updates" icon={HistoryIcon}>
				<div className="p-4 space-y-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-12 rounded-lg" />
					))}
				</div>
			</DashboardCard>
		);
	}

	return (
		<DashboardCard
			className={className}
			title={t("dashboard.latest_updates", "Latest Updates")}
			icon={HistoryIcon}
			headerAction={
				<Button
					variant="ghost"
					size="sm"
					className="h-7 w-7 p-0 hover:bg-neutral-200/50"
				>
					<SearchIcon className="w-4 h-4 text-neutral-400" />
				</Button>
			}
		>
			<div className="flex flex-col">
				{/* Minimal Filters & Context */}
				<div className="px-4 pt-4 flex items-center justify-between">
					<div className="text-[11px] font-bold text-neutral-900">
						{boardings.length}{" "}
						{t("dashboard.new_activities_today", "new activities today")}
					</div>
					<div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide">
						<button
							type="button"
							className="text-neutral-900 hover:text-neutral-600 transition-colors"
						>
							{t("dashboard.today", "Today")}
						</button>
						<button
							type="button"
							className="text-neutral-400 hover:text-neutral-900 transition-colors"
						>
							{t("dashboard.past", "Past")}
						</button>
					</div>
				</div>

				<div className="p-4 relative">
					{/* Vertical Timeline Line */}
					<div className="absolute left-[31px] top-6 bottom-6 w-px bg-neutral-100 border-l border-dashed border-neutral-200" />

					<div className="space-y-6 relative">
						{boardings.slice(0, 6).map((boarding) => (
							<Link
								key={boarding.id}
								to="/boardings/$id"
								params={{ id: boarding.id }}
								className="flex items-start justify-between group cursor-pointer"
							>
								<div className="flex items-start gap-4">
									<div className="relative z-10 w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center  group-hover:border-mint-green group-hover:bg-mint-green/5 transition-all">
										<Cat className="w-4 h-4 text-neutral-400 group-hover:text-mint-green transition-colors" />
									</div>
									<div className="flex flex-col pt-0.5">
										<div className="text-[12px] font-bold text-neutral-900 group-hover:text-mint-green transition-colors">
											{t("dashboard.boarding_created", "Boarding Created")}
										</div>
										<div className="text-[11px] text-neutral-400 font-medium leading-tight mt-0.5">
											{boarding.ownerName} • {boarding.pets.length}{" "}
											{t("dashboard.pets", "pets")}
										</div>
									</div>
								</div>
								<div className="text-[10px] font-bold text-neutral-400 pt-1 uppercase tabular-nums">
									{new Date(boarding.checkInDate).toLocaleTimeString("id-ID", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
							</Link>
						))}
					</div>
				</div>

				<div className="p-4 pt-2 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/30">
					<span className="text-[11px] text-neutral-400 font-medium">
						{t("common.showing", "Showing")} 6{" "}
						{t("dashboard.updates", "updates")}
					</span>
					<Link
						to="/boardings"
						className="text-[11px] font-bold text-mint-green hover:underline flex items-center gap-1"
					>
						{t("common.view_all", "View All")} →
					</Link>
				</div>
			</div>
		</DashboardCard>
	);
};
