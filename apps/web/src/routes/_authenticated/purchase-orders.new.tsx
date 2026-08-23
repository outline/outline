import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AltArrowLeftLinear as ArrowLeft,
	TrashBinMinimalisticLinear as TrashIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createPurchaseOrder } from "@/lib/api/po.functions";
import { getProducts } from "@/lib/api/products.functions";
import { getSuppliers } from "@/lib/api/supplier.functions";
import { APP_CONFIG } from "@/lib/constants";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/purchase-orders/new")({
	head: () => ({
		meta: [
			{
				title: `${i18n.t("purchase_order.new_meta_title")} — ${APP_CONFIG.name}`,
			},
			{
				name: "description",
				content: i18n.t("purchase_order.new_meta_desc"),
			},
		],
	}),
	component: NewPurchaseOrderPage,
});

function NewPurchaseOrderPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	const { data: suppliers = [] } = useQuery({
		queryKey: queryKeys.suppliers.list(),
		queryFn: () => getSuppliers(),
	});

	const { data: products = [] } = useQuery({
		queryKey: queryKeys.products.list(),
		queryFn: () => getProducts(),
	});

	const [supplierId, setSupplierId] = useState<string>("");
	const [expectedDate, setExpectedDate] = useState<string>("");
	const [items, setItems] = useState<
		Array<{ productId: string; qty: number; unitCost: number }>
	>([{ productId: "", qty: 1, unitCost: 0 }]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const createMutation = useMutation({
		mutationFn: () =>
			createPurchaseOrder({
				data: {
					supplierId,
					expectedDate: expectedDate
						? new Date(expectedDate).toISOString()
						: undefined,
					items: items
						.filter((i) => i.productId && i.qty > 0 && i.unitCost >= 0)
						.map((i) => ({
							variantId: i.productId,
							qtyOrdered: i.qty,
							unitCost: i.unitCost,
						})),
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.po_created"),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.purchaseOrders.all(),
			});
			navigate({ to: "/purchase-orders" });
		},
		onError: (error) => {
			toast.error(i18n.t("toast.po_create_failed"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
		onSettled: () => setIsSubmitting(false),
	});

	const handleSave = () => {
		if (!supplierId) {
			toast.error(i18n.t("common.error_title"), {
				description: i18n.t("toast.supplier_required"),
			});
			return;
		}
		if (items.filter((i) => i.productId).length === 0) {
			toast.error(i18n.t("common.error_title"), {
				description: i18n.t("toast.product_required"),
			});
			return;
		}
		setIsSubmitting(true);
		createMutation.mutate();
	};

	const addItem = () => {
		setItems([...items, { productId: "", qty: 1, unitCost: 0 }]);
	};

	const removeItem = (index: number) => {
		setItems(items.filter((_, i) => i !== index));
	};

	const updateItem = (index: number, field: string, value: string | number) => {
		const newItems = [...items];
		newItems[index] = {
			...newItems[index],
			[field]: value,
		} as (typeof newItems)[number];
		setItems(newItems);
	};

	const totalAmount = items.reduce(
		(sum, item) => sum + item.qty * item.unitCost,
		0,
	);

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("purchase_order.create_po_title")}
				description={t("purchase_order.create_po_desc")}
				actions={
					<Button
						variant="outline"
						onClick={() => navigate({ to: "/purchase-orders" })}
					>
						<ArrowLeft className="w-4 h-4 mr-2" /> {i18n.t("common.back")}
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-4xl mx-auto space-y-8">
					<div className="grid grid-cols-2 gap-6 bg-neutral-50 p-6 rounded-xl border border-neutral-200">
						<div className="space-y-2">
							<Label>{t("purchase_order.supplier")}</Label>
							<Select value={supplierId} onValueChange={setSupplierId}>
								<SelectTrigger className="bg-white">
									<SelectValue
										placeholder={t("purchase_order.select_supplier")}
									/>
								</SelectTrigger>
								<SelectContent>
									{suppliers.map((sup) => (
										<SelectItem key={sup.id} value={sup.id}>
											{sup.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>{t("purchase_order.est_arrival_label")}</Label>
							<Input
								type="date"
								className="bg-white"
								value={expectedDate}
								onChange={(e) => setExpectedDate(e.target.value)}
							/>
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<h3 className="text-lg font-bold text-neutral-900">
								{t("purchase_order.product_list")}
							</h3>
							<Button variant="outline" size="sm" onClick={addItem}>
								{t("common.add_row", "+ Tambah Baris")}
							</Button>
						</div>

						<div className="border border-neutral-200 rounded-xl overflow-hidden">
							<table className="w-full text-left">
								<thead>
									<tr className="bg-neutral-50/50 border-b border-neutral-200">
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase">
											{t("inventory.product")}
										</th>
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase w-[120px]">
											{t("purchase_order.quantity_label")}
										</th>
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase w-[150px]">
											{t("purchase_order.unit_price_rp")}
										</th>
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase w-[150px]">
											{t("purchase_order.subtotal_rp")}
										</th>
										<th className="px-4 py-3 text-[11px] font-bold text-neutral-500 uppercase w-[60px]"></th>
									</tr>
								</thead>
								<tbody className="divide-y divide-neutral-100">
									{items.map((item, index) => (
										<tr key={index}>
											<td className="p-4">
												<Select
													value={item.productId}
													onValueChange={(val) =>
														updateItem(index, "productId", val)
													}
												>
													<SelectTrigger>
														<SelectValue
															placeholder={t("purchase_order.select_product")}
														/>
													</SelectTrigger>
													<SelectContent>
														{products.map((prod) => (
															<SelectItem key={prod.id} value={prod.id}>
																{prod.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</td>
											<td className="p-4">
												<Input
													type="number"
													min={1}
													value={item.qty}
													onChange={(e) =>
														updateItem(
															index,
															"qty",
															parseInt(e.target.value, 10) || 0,
														)
													}
												/>
											</td>
											<td className="p-4">
												<Input
													type="number"
													min={0}
													value={item.unitCost}
													onChange={(e) =>
														updateItem(
															index,
															"unitCost",
															parseInt(e.target.value, 10) || 0,
														)
													}
												/>
											</td>
											<td className="p-4 text-[14px] font-bold text-neutral-900">
												{(item.qty * item.unitCost).toLocaleString("id-ID")}
											</td>
											<td className="p-4 text-center">
												<Button
													variant="ghost"
													size="icon"
													className="text-rose-500 h-8 w-8 hover:bg-rose-50 hover:text-rose-600"
													onClick={() => removeItem(index)}
												>
													<TrashIcon className="w-4 h-4" />
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex justify-between items-center bg-neutral-900 text-white p-6 rounded-xl">
						<div className="text-[16px] font-medium text-neutral-300">
							{t("purchase_order.total_po")}
						</div>
						<div className="text-2xl font-bold">
							Rp {totalAmount.toLocaleString("id-ID")}
						</div>
					</div>

					<div className="flex justify-end gap-4">
						<Button
							variant="outline"
							onClick={() => navigate({ to: "/purchase-orders" })}
						>
							{t("common.cancel")}
						</Button>
						<Button onClick={handleSave} disabled={isSubmitting}>
							{isSubmitting
								? t("common.saving")
								: t("purchase_order.create_po_action")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
