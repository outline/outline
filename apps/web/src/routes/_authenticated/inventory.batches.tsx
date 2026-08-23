import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BoxMinimalisticLinear as BoxIcon } from "solar-icon-set";
import { getBatches } from "@/lib/api/inventory.functions";
import { getProducts } from "@/lib/api/products.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/shared/utils";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/_authenticated/inventory/batches")({
	component: InventoryBatches,
});

function InventoryBatches() {
	const { t, i18n } = useTranslation();
	const getBatchesFn = useServerFn(getBatches);
	const getProductsFn = useServerFn(getProducts);

	const [selectedVariantId, setSelectedVariantId] = useState<string>("");

	const { data: products, isLoading: loadingProducts } = useQuery({
		queryKey: queryKeys.products.list(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		queryFn: () => getProductsFn(),
	});

	const { data: batches, isLoading: loadingBatches } = useQuery({
		queryKey: selectedVariantId
			? [...queryKeys.inventory.productBatches(selectedVariantId)]
			: queryKeys.inventory.batches(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		queryFn: () => getBatchesFn({ data: selectedVariantId }),
		enabled: !!selectedVariantId,
	});

	// Flatten products into a list of variants for the dropdown
	const variantOptions =
		products?.flatMap((p) =>
			p.variants.map((v) => ({
				id: v.id,
				label: `${p.name} - ${v.name} (${v.sku || "No SKU"})`,
			})),
		) || [];

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<h2 className="text-lg font-semibold">
					{t("inventory.stock_per_batch")}
				</h2>

				<div className="w-full sm:w-72">
					<select
						className="w-full h-10 px-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
						value={selectedVariantId}
						onChange={(e) => setSelectedVariantId(e.target.value)}
						disabled={loadingProducts}
					>
						<option value="">{t("inventory.select_variant")}</option>
						{variantOptions.map((opt) => (
							<option key={opt.id} value={opt.id}>
								{opt.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
				{!selectedVariantId ? (
					<div className="p-12">
						<EmptyState
							icon={BoxIcon}
							title={t("inventory.select_product_title")}
							description={t("inventory.select_product_desc")}
						/>
					</div>
				) : loadingBatches ? (
					<div className="divide-y divide-neutral-100">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="px-6 py-4 flex items-center gap-6">
								<Skeleton className="h-4 w-24 rounded-lg" />
								<Skeleton className="h-4 w-20 rounded-lg" />
								<Skeleton className="h-4 w-16 rounded-lg" />
								<Skeleton className="h-4 w-16 rounded-lg" />
								<Skeleton className="h-4 w-20 rounded-lg" />
								<Skeleton className="h-4 w-24 rounded-lg" />
							</div>
						))}
					</div>
				) : batches && batches.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 bg-neutral-50">
									<th className="px-6 py-4 font-medium">
										{t("inventory.received_date")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.batch_no")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.remaining_stock")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.initial_stock")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.cost_price")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.expiry_date")}
									</th>
								</tr>
							</thead>
							<tbody className="text-sm divide-y divide-neutral-100">
								{batches.map((batch) => {
									const isExpired =
										batch.expiryDate && new Date(batch.expiryDate) < new Date();

									return (
										<tr
											key={batch.id}
											className="hover:bg-neutral-50/50 transition-colors"
										>
											<td className="px-6 py-4 text-neutral-900">
												{formatDate(
													batch.createdAt,
													i18n.language as "id" | "en",
												)}
											</td>
											<td className="px-6 py-4 font-mono text-xs">
												{batch.batchNumber || "-"}
											</td>
											<td className="px-6 py-4 font-semibold">
												{batch.quantity}
											</td>
											<td className="px-6 py-4 text-neutral-500">
												{batch.initialQty}
											</td>
											<td className="px-6 py-4">
												{formatCurrency(
													batch.costPrice,
													i18n.language as "id" | "en",
												)}
											</td>
											<td className="px-6 py-4">
												{batch.expiryDate ? (
													<span
														className={
															isExpired ? "text-red-600 font-medium" : ""
														}
													>
														{formatDate(
															batch.expiryDate,
															i18n.language as "id" | "en",
														)}
													</span>
												) : (
													"-"
												)}
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
							title={t("inventory.no_batches_title")}
							description={t("inventory.no_batches_desc")}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
