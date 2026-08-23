import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	ArrowLeftLinear,
	ArrowRightLinear,
	BoxMinimalisticLinear as BoxIcon,
	RefreshLinear,
} from "solar-icon-set";
import { getMovements } from "@/lib/api/inventory.functions";
import { getProducts } from "@/lib/api/products.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/shared/utils";
import { EmptyState } from "@/ui";

export const Route = createFileRoute("/_authenticated/inventory/movements")({
	component: InventoryMovements,
});

function InventoryMovements() {
	const { t, i18n } = useTranslation();
	const getMovementsFn = useServerFn(getMovements);
	const getProductsFn = useServerFn(getProducts);

	const [selectedVariantId, setSelectedVariantId] = useState<string>("");

	const { data: products, isLoading: loadingProducts } = useQuery({
		queryKey: queryKeys.products.list(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		queryFn: () => getProductsFn(),
	});

	const { data: movements, isLoading: loadingMovements } = useQuery({
		queryKey: selectedVariantId
			? [...queryKeys.inventory.movements(), selectedVariantId]
			: queryKeys.inventory.movements(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		queryFn: () => getMovementsFn({ data: selectedVariantId }),
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

	const getTypeLabel = (type: string) => {
		switch (type) {
			case "in":
				return {
					label: t("inventory.type_labels.in"),
					color: "text-green-600 bg-green-50",
					icon: <ArrowRightLinear className="w-4 h-4" />,
				};
			case "out":
				return {
					label: t("inventory.type_labels.out"),
					color: "text-red-600 bg-red-50",
					icon: <ArrowLeftLinear className="w-4 h-4" />,
				};
			case "adjustment":
				return {
					label: t("inventory.type_labels.adjustment"),
					color: "text-blue-600 bg-blue-50",
					icon: <RefreshLinear className="w-4 h-4" />,
				};
			case "return":
				return {
					label: t("inventory.type_labels.return"),
					color: "text-orange-600 bg-orange-50",
					icon: <ArrowLeftLinear className="w-4 h-4" />,
				};
			default:
				return {
					label: type,
					color: "text-neutral-600 bg-neutral-100",
					icon: null,
				};
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<h2 className="text-lg font-semibold">
					{t("inventory.stock_movements_history")}
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
							description={t("inventory.select_product_movement_desc")}
						/>
					</div>
				) : loadingMovements ? (
					<div className="divide-y divide-neutral-100">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="px-6 py-4 flex items-center gap-6">
								<Skeleton className="h-4 w-24 rounded-lg" />
								<Skeleton className="h-6 w-20 rounded-full" />
								<Skeleton className="h-4 w-12 rounded-lg" />
								<Skeleton className="h-4 w-28 rounded-lg" />
								<Skeleton className="h-4 w-32 rounded-lg" />
							</div>
						))}
					</div>
				) : movements && movements.length > 0 ? (
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse">
							<thead>
								<tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500 bg-neutral-50">
									<th className="px-6 py-4 font-medium">
										{t("inventory.date")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.type")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.quantity_table")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.reference")}
									</th>
									<th className="px-6 py-4 font-medium">
										{t("inventory.notes")}
									</th>
								</tr>
							</thead>
							<tbody className="text-sm divide-y divide-neutral-100">
								{movements.map((movement) => {
									const typeInfo = getTypeLabel(movement.type);

									return (
										<tr
											key={movement.id}
											className="hover:bg-neutral-50/50 transition-colors"
										>
											<td className="px-6 py-4 text-neutral-900">
												{formatDate(
													movement.createdAt,
													i18n.language as "id" | "en",
												)}
											</td>
											<td className="px-6 py-4">
												<span
													className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}
												>
													{typeInfo.icon}
													{typeInfo.label}
												</span>
											</td>
											<td className="px-6 py-4 font-mono font-medium">
												{movement.quantity > 0 ? "+" : ""}
												{movement.quantity}
											</td>
											<td className="px-6 py-4">
												{movement.referenceType ? (
													<span className="uppercase text-xs font-semibold text-neutral-500">
														{movement.referenceType}{" "}
														{movement.referenceId
															? `(${movement.referenceId.substring(0, 8)})`
															: ""}
													</span>
												) : (
													"-"
												)}
											</td>
											<td className="px-6 py-4 text-neutral-600">
												{movement.notes || "-"}
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
							title={t("inventory.no_movements_title")}
							description={t("inventory.no_movements_desc")}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
