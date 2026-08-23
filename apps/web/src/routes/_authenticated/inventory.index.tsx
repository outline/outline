import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
	DangerCircleLinear as AlertIcon,
	BoxMinimalisticLinear as BoxIcon,
	ClockSquareLinear as ClockIcon,
} from "solar-icon-set";
import { Skeleton } from "@/components/ui/skeleton";
import { getExpiringBatches } from "@/lib/api/inventory.functions";
import { getProducts } from "@/lib/api/products.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { formatDate } from "@/shared/utils";
import {
	DashboardCard,
	DashboardMetric,
	DashboardMetricGroup,
	EmptyState,
} from "@/ui";

export const Route = createFileRoute("/_authenticated/inventory/")({
	component: InventoryDashboard,
});

function InventoryDashboard() {
	const { t } = useTranslation();
	const getExpiringBatchesFn = useServerFn(getExpiringBatches);
	const getProductsFn = useServerFn(getProducts);

	const { data: products } = useQuery({
		queryKey: queryKeys.products.list(),
		queryFn: () => getProductsFn(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

	const { data: expiringBatches, isLoading } = useQuery({
		queryKey: [...queryKeys.inventory.expiringBatches(), 30],
		queryFn: () => getExpiringBatchesFn({ data: 30 }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

	// Create a quick lookup for variant/product name
	const variantLookup = new Map<
		string,
		{ productName: string; variantName: string }
	>();
	if (products) {
		products.forEach((p) => {
			p.variants.forEach((v) => {
				variantLookup.set(v.id, { productName: p.name, variantName: v.name });
			});
		});
	}

	return (
		<div className="space-y-6">
			<h2 className="text-lg font-semibold">
				{t("inventory.dashboard_title")}
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<DashboardCard title={t("inventory.expiring_batches")} icon={ClockIcon}>
					<DashboardMetricGroup>
						<DashboardMetric
							label={t("inventory.next_30_days")}
							value={expiringBatches?.length.toString() || "0"}
						/>
					</DashboardMetricGroup>
				</DashboardCard>
				<DashboardCard title={t("inventory.total_stock_out")} icon={BoxIcon}>
					<DashboardMetricGroup>
						<DashboardMetric label={t("inventory.this_week")} value="-" />
					</DashboardMetricGroup>
				</DashboardCard>
			</div>

			<div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
				<div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3">
					<div className="p-2 bg-red-50 text-red-600 rounded-lg">
						<AlertIcon className="w-5 h-5" />
					</div>
					<div>
						<h3 className="font-semibold text-neutral-900">
							{t("inventory.expiry_alert")}
						</h3>
						<p className="text-sm text-neutral-500">
							{t("inventory.expiry_alert_desc")}
						</p>
					</div>
				</div>

				{isLoading ? (
					<div className="divide-y divide-neutral-100">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="px-6 py-4 flex items-center gap-6">
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-40 rounded-lg" />
									<Skeleton className="h-3 w-24 rounded-lg" />
								</div>
								<Skeleton className="h-4 w-20 rounded-lg" />
								<Skeleton className="h-4 w-16 rounded-lg" />
								<Skeleton className="h-4 w-24 rounded-lg" />
								<Skeleton className="h-6 w-20 rounded-full" />
							</div>
						))}
					</div>
				) : expiringBatches && expiringBatches.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 bg-neutral-50">
									<th className="px-6 py-4 font-medium">
										{t("inventory.product")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.batch_no")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.remaining_stock")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.expiry_date")}
									</th>
									<th className="px-6 py-4 font-medium text-right">
										{t("inventory.status")}
									</th>
								</tr>
							</thead>
							<tbody className="text-sm divide-y divide-neutral-100">
								{expiringBatches.map((batch) => {
									const info = variantLookup.get(batch.variantId);
									const expiryDate = batch.expiryDate ?? "";
									const isExpired = expiryDate
										? new Date(expiryDate) < new Date()
										: false;

									return (
										<tr
											key={batch.id}
											className="hover:bg-neutral-50/50 transition-colors"
										>
											<td className="px-6 py-4">
												<div className="font-medium text-neutral-900">
													{info?.productName || "Unknown"}
												</div>
												<div className="text-xs text-neutral-500">
													{info?.variantName || "Variant"}
												</div>
											</td>
											<td className="px-6 py-4 font-mono text-xs">
												{batch.batchNumber || "-"}
											</td>
											<td className="px-6 py-4">{batch.quantity}</td>

											<td className="px-6 py-4">
												{expiryDate ? formatDate(expiryDate, "id") : "-"}
											</td>
											<td className="px-6 py-4 text-right">
												<span
													className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
														isExpired
															? "bg-red-100 text-red-700"
															: "bg-orange-100 text-orange-700"
													}`}
												>
													{isExpired
														? t("inventory.expired")
														: t("inventory.expiring_soon")}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<div className="p-12">
						<EmptyState
							icon={BoxIcon}
							title={t("inventory.stock_safe")}
							description={t("inventory.no_expiring_batches")}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
