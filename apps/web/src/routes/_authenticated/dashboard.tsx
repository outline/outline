import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
	CalendarBold as CalendarIcon,
	AltArrowDownBoldDuotone as ChevronDown,
	FileDownloadBold as ExportIcon,
	FilterBold as FilterIcon,
	MenuDotsBold as MenuIcon,
	AddCircleBoldDuotone as Plus,
	RefreshBold as RefreshIcon,
	SettingsBold as SettingsIcon,
	EyeBold as ViewIcon,
} from "solar-icon-set";
import { CommandSearch } from "@/components/brand/CommandSearch";
import { AppVersionInfo } from "@/components/layout/AppVersionInfo";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BoardingTable } from "@/domain/boarding";
import {
	MetricGrid,
	OccupancyCard,
	RecentBoardings,
	SalesChart,
	TopSellers,
} from "@/domain/dashboard";
import {
	deleteBoarding,
	getBoardings,
	getDashboardMetrics,
} from "@/lib/api/boardings.functions";
import {
	getInventoryItems,
	getTopSellers,
} from "@/lib/api/dashboard.functions";
import { APP_CONFIG } from "@/lib/constants";
import { generatePDFReport } from "@/lib/report.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateBoardings } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { useSession } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatCurrency, formatDate } from "@/shared/utils";
import { DashboardCard, ErrorState, PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/dashboard")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("dashboard.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("dashboard.description"),
			},
		],
	}),
	component: DashboardPage,
});

function DashboardPage() {
	const { session } = useSession();
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const isMac = React.useMemo(
		() =>
			typeof navigator !== "undefined" &&
			/Mac|iPod|iPhone|iPad/.test(navigator.platform),
		[],
	);
	const _modKey = isMac ? "⌘" : "Ctrl";

	const role = session?.role || "staff_daycare";
	const isManagement =
		role === "owner" || role === "manager" || role === "admin";

	const {
		data: metrics,
		isLoading: isLoadingMetrics,
		isError: isErrorMetrics,
		refetch: refetchMetrics,
	} = useQuery({
		queryKey: queryKeys.dashboard.metrics(),
		queryFn: () => getDashboardMetrics(),
		enabled: isManagement,
		staleTime: QUERY_POLICY.realtime.staleTime,
		gcTime: QUERY_POLICY.realtime.gcTime,
	});

	const {
		data: boardings = [],
		isLoading: isLoadingBoardings,
		isError: isErrorBoardings,
		refetch: refetchBoardings,
	} = useQuery({
		queryKey: queryKeys.boardings.list(),
		queryFn: () => getBoardings(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

	const { data: topSellers = [] } = useQuery({
		queryKey: queryKeys.dashboard.topSellers(),
		queryFn: () => getTopSellers(),
		staleTime: QUERY_POLICY.realtime.staleTime,
		gcTime: QUERY_POLICY.realtime.gcTime,
	});

	const { data: inventoryData } = useQuery({
		queryKey: queryKeys.dashboard.inventory(),
		queryFn: () => getInventoryItems(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteBoarding,
		onSuccess: () => {
			invalidateBoardings(queryClient);
			toast.success(i18n.t("common.success_title"), {
				description: t("success.deleted"),
			});
		},
	});

	if (isErrorMetrics || isErrorBoardings) {
		return (
			<ErrorState
				onRetry={() => {
					refetchMetrics();
					refetchBoardings();
				}}
			/>
		);
	}

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			{/* Page Header: Greeting & Global Filters */}
			<PageHeader
				title={t("dashboard.hello", {
					name:
						session?.fullName?.split(" ")[0] ?? t("dashboard.welcome_fallback"),
				})}
				description={t(
					"dashboard.subtitle",
					"Here are the latest insights from your store.",
				)}
				docHref="/docs/dashboard"
				actions={
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="h-9 px-3 rounded-lg border-neutral-200 bg-white  text-[13px] font-bold text-neutral-700"
								>
									<CalendarIcon className="w-4 h-4 mr-2 text-neutral-500" />
									{t("dashboard.last_week")}
									<ChevronDown className="w-3.5 h-3.5 ml-2 text-neutral-400" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-40">
								<DropdownMenuItem className="py-2 px-2.5 cursor-pointer text-[13px]">
									{t("dashboard.today")}
								</DropdownMenuItem>
								<DropdownMenuItem className="py-2 px-2.5 cursor-pointer text-[13px]">
									{t("dashboard.yesterday")}
								</DropdownMenuItem>
								<DropdownMenuItem className="py-2 px-2.5 cursor-pointer text-[13px] bg-neutral-100 font-bold">
									{t("dashboard.last_week")}
								</DropdownMenuItem>
								<DropdownMenuItem className="py-2 px-2.5 cursor-pointer text-[13px]">
									{t("dashboard.last_month")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9 rounded-lg border-neutral-200 bg-white "
								>
									<MenuIcon className="w-4 h-4 text-neutral-500" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								<DropdownMenuItem
									className="flex items-center gap-2 cursor-pointer py-2 px-2.5"
									onClick={() => {
										refetchMetrics();
										refetchBoardings();
									}}
								>
									<RefreshIcon className="w-4 h-4 text-neutral-500" />
									<span className="text-[13px]">
										{t("dashboard.refresh_dashboard")}
									</span>
								</DropdownMenuItem>
								<DropdownMenuItem
									className="flex items-center gap-2 cursor-pointer py-2 px-2.5"
									onClick={() => {
										if (!metrics) return;
										generatePDFReport({
											title: t("dashboard.business_summary_report"),
											businessName: session?.businessName || APP_CONFIG.name,
											date: formatDate(new Date(), "id"),
											sections: [
												{
													title: t("dashboard.financial_metrics"),
													items: [
														{
															label: t("dashboard.revenue_today"),
															value: formatCurrency(
																metrics.revenueToday || 0,
																"id",
															),
														},
														{
															label: t("dashboard.transactions_today"),
															value: metrics.transactionsToday || 0,
														},
													],
												},
												{
													title: t("dashboard.operations"),
													items: [
														{
															label: t("dashboard.boarding_active"),
															value: metrics.activeBoardings || 0,
														},
														{
															label: t("dashboard.completed_month"),
															value: metrics.completedMonth || 0,
														},
													],
												},
												{
													title: t("dashboard.inventory"),
													items: [
														{
															label: t("dashboard.low_stock"),
															value: metrics.lowStockProducts || 0,
														},
													],
												},
											],
										});
									}}
								>
									<ExportIcon className="w-4 h-4 text-neutral-500" />
									<span className="text-[13px]">
										{t("dashboard.download_report")}
									</span>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2 px-2.5">
									<SettingsIcon className="w-4 h-4 text-neutral-500" />
									<span className="text-[13px]">
										{t("dashboard.dashboard_settings")}
									</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-7xl mx-auto space-y-8">
					{/* Tier 1 & 2: Masonry Dashboard Layout */}
					<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
						{/* Left Section: Metrics and Chart (Span 3 Columns) */}
						<div className="lg:col-span-3 flex flex-col gap-6">
							<MetricGrid
								metrics={
									metrics as unknown as React.ComponentProps<
										typeof MetricGrid
									>["metrics"]
								}
								isLoading={isLoadingMetrics}
							/>

							<SalesChart
								className="flex-1"
								volumeData={metrics?.volumeData || []}
								growth={metrics?.transactionsGrowth || 0}
							/>
						</div>

						{/* Right Section: Activity Feed & Top Sellers (Span 1 Column, tall) */}
						<div className="lg:col-span-1 flex flex-col gap-6">
							<OccupancyCard
								activeBoardings={metrics?.activeBoardings ?? 0}
								totalCapacity={100}
								inventoryItems={inventoryData?.items || []}
								totalItems={inventoryData?.totalCount || 0}
							/>
							<TopSellers topSellers={topSellers} />
							<RecentBoardings
								boardings={
									boardings as unknown as React.ComponentProps<
										typeof RecentBoardings
									>["boardings"]
								}
								isLoading={isLoadingBoardings}
							/>
						</div>
					</div>

					{/* Tier 3: SLA Monitoring Style Table (Full Width) */}
					<DashboardCard
						title={t("dashboard.boarding.boarding_list")}
						icon={Plus} // Placeholder icon
						headerAction={
							<div className="flex items-center gap-2">
								<div className="w-[200px]">
									<CommandSearch />
								</div>
								<Button
									variant="outline"
									size="sm"
									className="h-8 px-3 text-[11px] font-bold border-neutral-200 bg-neutral-50  rounded-full text-neutral-600"
								>
									<FilterIcon className="w-3.5 h-3.5 mr-1.5 text-neutral-500" />
									{t("dashboard.filter")}
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											size="icon"
											className="h-8 w-8 border-neutral-200 bg-neutral-50  rounded-full text-neutral-600"
										>
											<MenuIcon className="w-4 h-4 text-neutral-500" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-44">
										<DropdownMenuItem
											className="flex items-center gap-2 cursor-pointer py-2 px-2.5"
											onClick={() => refetchBoardings()}
										>
											<RefreshIcon className="w-4 h-4 text-neutral-500" />
											<span className="text-[13px]">{t("common.refresh")}</span>
										</DropdownMenuItem>
										<DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2 px-2.5">
											<ExportIcon className="w-4 h-4 text-neutral-500" />
											<span className="text-[13px]">
												{t("common.export_data")}
											</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem className="p-0">
											<Link
												to="/boardings"
												className="flex items-center gap-2 cursor-pointer w-full py-2 px-2.5"
											>
												<ViewIcon className="w-4 h-4 text-neutral-500" />
												<span className="text-[13px]">
													{t("common.view_all")}
												</span>
											</Link>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						}
					>
						<BoardingTable
							boardings={boardings.filter((b) => b.status === "active")}
							isLoading={isLoadingBoardings}
							onDelete={(id) => deleteMutation.mutate({ data: id })}
							flat
						/>
					</DashboardCard>

					<div className="mt-8 pt-8 pb-2 text-center border-t border-neutral-100">
						<AppVersionInfo
							appVersion={__APP_VERSION__}
							buildNumber={__BUILD_NUMBER__}
							commitHash={__COMMIT_HASH__}
							className="inline-block text-center w-auto"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
