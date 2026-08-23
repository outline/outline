import { useTranslation } from "react-i18next";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	CalendarBold as CalendarIcon,
	ChartBoldDuotone as ChartIcon,
	AltArrowDownBold as ChevronDown,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/shared/i18n";
import { formatNumber } from "@/shared/utils/format";
import { DashboardCard } from "@/ui";

export type TSalesChartProps = {
	readonly volumeData?: readonly {
		readonly day: string;
		readonly count: number;
		readonly active: boolean;
	}[];
	readonly growth?: number;
	readonly className?: string;
};

export const SalesChart = ({
	className,
	volumeData = [],
	growth = 0,
}: TSalesChartProps) => {
	const { language } = useLanguage();
	const { t } = useTranslation();

	const totalVolume = volumeData.reduce((sum, d) => sum + d.count, 0);
	const growthSign = growth >= 0 ? "+" : "";

	return (
		<DashboardCard
			className={className}
			contentClassName="flex flex-col"
			title={t("dashboard.transaction", "Transaction")}
			icon={ChartIcon}
			headerAction={
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="h-7 px-2 rounded-lg border-neutral-200 bg-white text-[11px] font-bold text-neutral-700"
						>
							<CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
							{t("dashboard.last_week", "Last week")}
							<ChevronDown className="w-3 h-3 ml-1.5 text-neutral-300" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem className="py-2 px-2.5 cursor-pointer text-[11px]">
							{t("dashboard.today", "Today")}
						</DropdownMenuItem>
						<DropdownMenuItem className="py-2 px-2.5 cursor-pointer text-[11px]">
							{t("dashboard.yesterday", "Yesterday")}
						</DropdownMenuItem>
						<DropdownMenuItem className="py-2 px-2.5 cursor-pointer text-[11px] bg-neutral-100 font-bold">
							{t("dashboard.last_week", "Last week")}
						</DropdownMenuItem>
						<DropdownMenuItem className="py-2 px-2.5 cursor-pointer text-[11px]">
							{t("dashboard.last_month", "Last month")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			}
		>
			<div className="flex-1 w-full min-h-[320px] flex flex-col p-6">
				{/* Volume Header */}
				<div className="flex flex-col mb-8">
					<div className="flex items-baseline gap-3">
						<span className="text-[32px] font-bold text-neutral-900 tracking-tighter tabular-nums">
							{formatNumber(totalVolume, language)}
						</span>
						<div
							className="flex items-center gap-1 text-[12px] font-bold tracking-tight"
							style={{ color: growth >= 0 ? "#10b981" : "#ef4444" }}
						>
							<span>
								{growthSign}
								{growth.toFixed(1)}%
							</span>
							<span className="text-neutral-400 font-medium">
								{t("dashboard.vs_yesterday", "vs yesterday")}
							</span>
						</div>
					</div>
				</div>

				{/* Chart Area */}
				<div className="flex-1 relative">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={[...volumeData]}
							margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
						>
							<CartesianGrid
								vertical={false}
								stroke="#f0f0f0"
								strokeDasharray="3 3"
							/>
							<XAxis
								dataKey="day"
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 11, fontWeight: 600, fill: "#a3a3a3" }}
								dy={10}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fontSize: 11, fontWeight: 600, fill: "#a3a3a3" }}
								tickCount={5}
							/>
							<Tooltip
								cursor={{ fill: "transparent" }}
								content={({ active, payload }) => {
									if (active && payload?.length) {
										return (
											<div className="bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800  relative">
												<p className="font-semibold text-neutral-900 mb-1">
													{payload[0]?.payload?.label}
												</p>
												{/* Tooltip Arrow Placeholder */}
												<div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-neutral-900 rotate-45 border-l border-b border-neutral-800" />
											</div>
										);
									}
									return null;
								}}
							/>
							<Bar dataKey="count" radius={[6, 6, 6, 6]} barSize={28}>
								{volumeData.map((entry, idx) => (
									<Cell
										key={`${entry.day}-${idx}`}
										fill={entry.active ? "#1e293b" : "#f1f1f1"}
										className="transition-all duration-300 hover:fill-neutral-800"
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		</DashboardCard>
	);
};
