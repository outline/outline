import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	SettingsLinear as Settings,
	UsersGroupRoundedLinear as Users,
} from "solar-icon-set";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import { LoyaltyConfigForm, TierList } from "@/domain/loyalty";
import { getLoyaltyConfig } from "@/lib/api/loyalty.functions";
import { APP_CONFIG } from "@/lib/constants";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	DashboardCard,
	DashboardMetric,
	DashboardMetricGroup,
	EmptyState,
	ErrorState,
	PageHeader,
} from "@/ui";

export const Route = createFileRoute("/_authenticated/loyalty")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({
		meta: [
			{ title: `${i18n.t("loyalty.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("loyalty.meta_description"),
			},
		],
	}),
	component: LoyaltyPage,
});

function LoyaltyPage() {
	const { t } = useTranslation();
	const {
		data: loyaltyData,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: queryKeys.loyalty.config(),
		queryFn: () => getLoyaltyConfig(),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
	});

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("loyalty.title")}
				description={t("loyalty.subtitle")}
				docHref="/docs/loyalty"
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-10">
					{isLoading ? (
						<div className="space-y-8">
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
								<div className="lg:col-span-2">
									<Skeleton className="h-[400px] rounded-2xl w-full" />
								</div>
								<div>
									<Skeleton className="h-[400px] rounded-2xl w-full" />
								</div>
							</div>
							<Skeleton className="h-48 rounded-2xl w-full" />
						</div>
					) : isError ? (
						<ErrorState onRetry={() => refetch()} />
					) : !loyaltyData ? (
						<EmptyState
							variant="loyalty"
							title={t("loyalty.data_unavailable")}
							description={t("loyalty.load_error_desc")}
							className="bg-white border-neutral-100 "
						/>
					) : (
						<>
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
								<Card className="lg:col-span-2">
									<CardHeader>
										<div className="flex items-center gap-2">
											<Settings className="w-4 h-4 text-neutral-400" />
											<CardTitle>{t("loyalty.point_settings")}</CardTitle>
										</div>
										<CardDescription>
											{t("loyalty.point_settings_desc")}
										</CardDescription>
									</CardHeader>
									<CardContent>
										<LoyaltyConfigForm config={loyaltyData.config} />
									</CardContent>
								</Card>

								<DashboardCard title={t("loyalty.quick_stats")} icon={Users}>
									<div className="divide-y divide-neutral-100">
										<DashboardMetricGroup>
											<DashboardMetric
												label={t("loyalty.total_registered_customers")}
												value="0"
											/>
										</DashboardMetricGroup>
										<DashboardMetricGroup>
											<DashboardMetric
												label={t("loyalty.points_in_circulation")}
												value="0"
											/>
										</DashboardMetricGroup>
									</div>
								</DashboardCard>
							</div>

							<div className="space-y-6">
								<div>
									<h2 className="text-lg font-bold text-neutral-900 tracking-tight">
										{t("loyalty.customer_tiers")}
									</h2>
									<p className="text-sm text-neutral-500 mt-1">
										{t("loyalty.tiers_desc")}
									</p>
								</div>

								<TierList tiers={loyaltyData.tiers} />
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
