import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/shared/utils";
import { Button, Modal } from "@/ui";

type OrderItem = {
	id: string;
	orderId: string;
	productId: string;
	productName?: string;
	quantity: number;
	priceAtTime: number;
};

type TOrderReturnModalProps = {
	isOpen: boolean;
	onClose: () => void;
	order: import("@/domain/order/order.types").TOrderWithItems | null;
	onConfirm: (payload: {
		orderId: string;
		items: Array<{
			orderItemId: string;
			quantity: number;
			reason: string;
			isDamaged: boolean;
		}>;
	}) => Promise<void>;
	processing: boolean;
};

export function OrderReturnModal({
	isOpen,
	onClose,
	order,
	onConfirm,
	processing,
}: TOrderReturnModalProps) {
	const { t, i18n } = useTranslation();
	const [selectedItems, setSelectedItems] = useState<
		Record<string, { qty: number; isDamaged: boolean; reason: string }>
	>({});
	const [globalReason, setGlobalReason] = useState("");
	const [refundMethod, setRefundMethod] = useState("cash");

	useEffect(() => {
		if (isOpen) {
			setSelectedItems({});
			setGlobalReason("");
			setRefundMethod("cash");
		}
	}, [isOpen]);

	if (!order) return null;

	const handleItemSelect = (item: OrderItem, checked: boolean) => {
		if (checked) {
			setSelectedItems((prev) => ({
				...prev,
				[item.id]: { qty: item.quantity, isDamaged: false, reason: "" },
			}));
		} else {
			const newItems = { ...selectedItems };
			delete newItems[item.id];
			setSelectedItems(newItems);
		}
	};

	const handleItemUpdate = (
		itemId: string,
		field: "qty" | "isDamaged" | "reason",
		value: number | boolean | string,
	) => {
		setSelectedItems((prev) => {
			const updated = { ...prev };
			const existing = updated[itemId] || {
				qty: 0,
				isDamaged: false,
				reason: "",
			};
			updated[itemId] = { ...existing, [field]: value } as {
				qty: number;
				isDamaged: boolean;
				reason: string;
			};
			return updated;
		});
	};

	const refundAmount = Object.entries(selectedItems).reduce(
		(sum, [itemId, data]) => {
			const item = order.items.find((i) => i.id === itemId);
			if (!item) return sum;
			return sum + item.priceAtTime * data.qty;
		},
		0,
	);

	const handleSubmit = async () => {
		const items = Object.entries(selectedItems).map(([id, data]) => ({
			orderItemId: id,
			quantity: data.qty,
			reason: data.reason || "",
			isDamaged: data.isDamaged,
		}));

		if (items.length === 0) {
			toast.error(i18n.t("common.error_title"), {
				description: i18n.t("toast.return_select_one"),
			});
			return;
		}

		// Validation
		for (const item of items) {
			const originalItem = order.items.find((i) => i.id === item.orderItemId);
			if (
				!originalItem ||
				item.quantity <= 0 ||
				item.quantity > originalItem.quantity
			) {
				toast.error(i18n.t("common.error_title"), {
					description: i18n.t("toast.return_invalid_qty"),
				});
				return;
			}
		}

		await onConfirm({
			orderId: order.id,
			items,
		});
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={t("order.process_return")}>
			<div className="space-y-6">
				<div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm">
					{t("order.return_hint")}
				</div>

				<div className="space-y-3">
					<h3 className="font-bold text-neutral-900">
						{t("order.order_items")}
					</h3>
					{order.items.map((item: OrderItem) => {
						const isSelected = !!selectedItems[item.id];
						const selectedData = selectedItems[item.id];

						return (
							<div
								key={item.id}
								className="border border-neutral-200 rounded-lg p-3 space-y-3"
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<Checkbox
											checked={isSelected}
											onCheckedChange={(c) => handleItemSelect(item, !!c)}
										/>
										<div>
											<div className="font-medium">
												{item.productName || t("product_page.default_category")}
											</div>
											<div className="text-xs text-neutral-500">
												{t("common.bought", "Dibeli")}: {item.quantity} x{" "}
												{formatCurrency(
													item.priceAtTime,
													i18n.language as import("@/shared/types/i18n.types").TLanguage,
												)}
											</div>
										</div>
									</div>
								</div>

								{isSelected && (
									<div className="pl-7 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
										<div className="space-y-2">
											<label className="text-xs font-bold text-neutral-700">
												{t("order.return_qty")}
											</label>
											<Input
												type="number"
												min={0.1}
												step={0.1}
												max={item.quantity}
												value={selectedData?.qty || ""}
												onChange={(e) =>
													handleItemUpdate(
														item.id,
														"qty",
														parseFloat(e.target.value) || 0,
													)
												}
											/>
										</div>
										<div className="space-y-2">
											<label className="text-xs font-bold text-neutral-700">
												{t("inventory.adjust_reason")} ({t("common.optional")})
											</label>
											<Input
												placeholder={t("order.return_reason_placeholder")}
												value={selectedData?.reason || ""}
												onChange={(e) =>
													handleItemUpdate(item.id, "reason", e.target.value)
												}
											/>
										</div>
										<div className="col-span-full">
											<label className="flex items-center gap-2 text-sm cursor-pointer">
												<Checkbox
													checked={!selectedData?.isDamaged}
													onCheckedChange={(c) =>
														handleItemUpdate(item.id, "isDamaged", !c)
													}
												/>
												<span
													className={
														!selectedData?.isDamaged
															? "text-emerald-600 font-medium"
															: "text-neutral-500"
													}
												>
													{t("order.return_good_condition")}
												</span>
											</label>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-200 pt-4">
					<div className="space-y-2">
						<label className="text-sm font-bold text-neutral-900">
							{t("order.general_return_reason")}
						</label>
						<Textarea
							placeholder={t("order.general_return_placeholder")}
							value={globalReason}
							onChange={(e) => setGlobalReason(e.target.value)}
							className="min-h-[80px]"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-sm font-bold text-neutral-900">
							{t("order.refund_method")}
						</label>
						<Select value={refundMethod} onValueChange={setRefundMethod}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="cash">
									{t("accounting.payment_methods.cash")}
								</SelectItem>
								<SelectItem value="transfer">
									{t("accounting.payment_methods.transfer")}
								</SelectItem>
								<SelectItem value="store_credit">
									{t("customers.balance", "Saldo")}
								</SelectItem>
							</SelectContent>
						</Select>

						<div className="mt-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex justify-between items-center">
							<span className="font-medium text-neutral-600">
								{t("order.total_refund")}
							</span>
							<span className="font-bold text-rose-500 text-lg">
								{formatCurrency(
									refundAmount,
									i18n.language as import("@/shared/types/i18n.types").TLanguage,
								)}
							</span>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
					<Button variant="outline" onClick={onClose} disabled={processing}>
						{t("common.cancel")}
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={processing || Object.keys(selectedItems).length === 0}
					>
						{processing ? t("common.processing") : t("order.process_return")}
					</Button>
				</div>
			</div>
		</Modal>
	);
}
