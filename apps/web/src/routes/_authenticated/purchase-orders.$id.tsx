import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AltArrowLeftLinear as ArrowLeft,
	BoxLinear as BoxIcon,
	BuildingsLinear as Building,
	CheckCircleLinear as CheckCircle,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getPurchaseOrderById,
	receivePurchaseOrder,
} from "@/lib/api/po.functions";
import { getProducts } from "@/lib/api/products.functions";
import { APP_CONFIG } from "@/lib/constants";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLanguage } from "@/shared/i18n";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";
import { formatDate } from "@/shared/utils/format";
import { ErrorState, PageHeader, StatusBadge } from "@/ui";

export const Route = createFileRoute("/_authenticated/purchase-orders/$id")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("purchase_order.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("purchase_order.meta_description"),
			},
		],
	}),
	component: PurchaseOrderDetailPage,
});

function PurchaseOrderDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const { language } = useLanguage();

	const {
		data: po,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.purchaseOrders.detail(id),
		queryFn: () => getPurchaseOrderById({ data: id }),
	});

	const { data: products = [] } = useQuery({
		queryKey: queryKeys.products.list(),
		queryFn: () => getProducts(),
	});

	// Receiving State
	const [receivingItems, setReceivingItems] = useState<Record<string, number>>(
		{},
	);
	const [isReceivingOpen, setIsReceivingOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const receiveMutation = useMutation({
		mutationFn: () =>
			receivePurchaseOrder({
				data: {
					poId: id,
					items: Object.entries(receivingItems)
						.filter(([_, qty]) => qty > 0)
						.map(([itemId, qty]) => ({
							poItemId: itemId,
							qtyReceived: qty,
						})),
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("purchase_order.receive_success"),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.purchaseOrders.all(),
			});
			setIsReceivingOpen(false);
		},
		onError: (error) => {
			toast.error(t("purchase_order.receive_error"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
		onSettled: () => setIsSubmitting(false),
	});

	const handleReceive = () => {
		const itemsToReceive = Object.entries(receivingItems).filter(
			([_, qty]) => qty > 0,
		);
		if (itemsToReceive.length === 0) {
			toast.error(t("common.error"), {
				description: t("purchase_order.no_qty_received"),
			});
			return;
		}

		setIsSubmitting(true);
		receiveMutation.mutate();
	};

	if (isLoading) {
		return (
			<div className="p-8 space-y-4">
				<Skeleton className="h-[100px] w-full rounded-xl" />
				<Skeleton className="h-[300px] w-full rounded-xl" />
			</div>
		);
	}

	if (error || !po) {
		return (
			<ErrorState
				error={error || new Error("Not Found")}
				onRetry={() =>
					queryClient.invalidateQueries({
						queryKey: queryKeys.purchaseOrders.detail(id),
					})
				}
			/>
		);
	}

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={`PO-${po.id.slice(0, 8).toUpperCase()}`}
				description={t("purchase_order.header_desc")}
				actions={
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => navigate({ to: "/purchase-orders" })}
						>
							<ArrowLeft className="w-4 h-4 mr-2" /> {i18n.t("common.back")}
						</Button>
						{(po.status === "draft" || po.status === "partial") &&
							!isReceivingOpen && (
								<Button onClick={() => setIsReceivingOpen(true)}>
									<BoxIcon className="w-4 h-4 mr-2" />{" "}
									{t("purchase_order.receive_barang")}
								</Button>
							)}
					</div>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-5xl mx-auto space-y-8">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-50 p-6 rounded-xl border border-neutral-200">
						<div className="space-y-1">
							<div className="text-[12px] font-bold text-neutral-500 uppercase">
								{t("purchase_order.po_status")}
							</div>
							<StatusBadge
								type={
									po.status === "received"
										? "success"
										: po.status === "partial"
											? "info"
											: po.status === "cancelled"
												? "error"
												: "warning"
								}
								label={
									po.status === "received"
										? t("purchase_order.status_labels.completed")
										: po.status === "partial"
											? t("purchase_order.status_labels.partial_received")
											: po.status === "cancelled"
												? t("purchase_order.status_labels.cancelled")
												: t("purchase_order.status_labels.draft_pending")
								}
							/>
						</div>
						<div className="space-y-1">
							<div className="text-[12px] font-bold text-neutral-500 uppercase">
								{t("purchase_order.supplier_id")}
							</div>
							<div className="text-[14px] font-bold flex items-center gap-2">
								<Building className="w-4 h-4 text-neutral-400" />
								{po.supplierId}
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-[12px] font-bold text-neutral-500 uppercase">
								{t("purchase_order.est_date")}
							</div>
							<div className="text-[14px] font-medium text-neutral-900">
								{po.expectedDate
									? formatDate(new Date(po.expectedDate), language)
									: "-"}
							</div>
						</div>
					</div>

					<div className="space-y-4">
						<h3 className="text-lg font-bold text-neutral-900">
							{t("purchase_order.item_detail")}
						</h3>

						<div className="border border-neutral-200 rounded-xl overflow-hidden">
							<table className="w-full text-left">
								<thead>
									<tr className="bg-neutral-50/50 border-b border-neutral-200">
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase">
											{t("inventory.product")}
										</th>
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase text-center w-[120px]">
											{t("purchase_order.status_labels.ordered", "Dipesan")}
										</th>
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase text-center w-[120px]">
											{t("purchase_order.status_labels.received", "Diterima")}
										</th>
										{isReceivingOpen && (
											<th className="px-4 py-3 text-[11px] font-bold text-blue-500 uppercase text-center w-[150px]">
												{t("purchase_order.receive_now")}
											</th>
										)}
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase text-right w-[150px]">
											{t("purchase_order.unit_price")}
										</th>
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase text-right w-[150px]">
											{t("purchase_order.subtotal")}
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-neutral-100">
									{po.items.map((item) => {
										const product = products.find(
											(p) => p.id === item.variantId,
										);
										const pendingQty = item.qtyOrdered - item.qtyReceived;

										return (
											<tr
												key={item.id}
												className={
													isReceivingOpen && pendingQty > 0
														? "bg-blue-50/30"
														: ""
												}
											>
												<td className="p-4">
													<div className="text-[14px] font-bold text-neutral-900">
														{product?.name || item.variantId}
													</div>
													<div className="text-[12px] text-neutral-500 mt-0.5">
														SKU:{" "}
														{String(
															(product as Record<string, unknown>)?.sku || "-",
														)}
													</div>
												</td>
												<td className="p-4 text-center text-[14px] font-medium text-neutral-900">
													{item.qtyOrdered}
												</td>
												<td className="p-4 text-center text-[14px] font-bold text-emerald-600 flex items-center justify-center gap-1">
													<CheckCircle className="w-3.5 h-3.5" />
													{item.qtyReceived}
												</td>
												{isReceivingOpen && (
													<td className="p-4 text-center">
														{pendingQty > 0 ? (
															<Input
																type="number"
																min={0}
																max={pendingQty}
																value={receivingItems[item.id] || 0}
																onChange={(e) => {
																	let val = parseInt(e.target.value, 10) || 0;
																	if (val > pendingQty) val = pendingQty;
																	if (val < 0) val = 0;
																	setReceivingItems((prev) => ({
																		...prev,
																		[item.id]: val,
																	}));
																}}
																className="w-24 mx-auto text-center font-bold text-blue-600 border-blue-200 focus-visible:ring-blue-500"
															/>
														) : (
															<StatusBadge
																type="success"
																label={t("purchase_order.complete")}
															/>
														)}
													</td>
												)}
												<td className="p-4 text-right text-[14px] text-neutral-600">
													Rp {item.unitCost.toLocaleString("id-ID")}
												</td>
												<td className="p-4 text-right text-[14px] font-bold text-neutral-900">
													Rp{" "}
													{(item.qtyOrdered * item.unitCost).toLocaleString(
														"id-ID",
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex justify-between items-center bg-neutral-900 text-white p-6 rounded-xl">
						<div className="text-[16px] font-medium text-neutral-300">
							{t("purchase_order.total_po")}
						</div>
						<div className="text-2xl font-bold">
							Rp {po.totalAmount.toLocaleString("id-ID")}
						</div>
					</div>

					{isReceivingOpen && (
						<div className="flex justify-end gap-4 p-6 bg-blue-50 rounded-xl border border-blue-100">
							<Button
								variant="outline"
								onClick={() => setIsReceivingOpen(false)}
							>
								{t("purchase_order.cancel_receiving")}
							</Button>
							<Button onClick={handleReceive} disabled={isSubmitting}>
								{isSubmitting
									? t("billing.processing")
									: t("purchase_order.confirm_receive")}
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
