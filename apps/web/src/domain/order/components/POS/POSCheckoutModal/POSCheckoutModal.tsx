import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrashBinMinimalisticLinear as TrashIcon } from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/shared/utils/format";
import { Modal } from "@/ui";
import type { TCartItem } from "../../../hooks/usePOSCart";

export type TPaymentEntry = {
	method: "cash" | "transfer" | "qris";
	amount: number;
};

type POSCheckoutModalProps = {
	isOpen: boolean;
	onClose: () => void;
	cart: readonly TCartItem[];
	subtotalAmount: number;
	globalDiscountType: "percentage" | "fixed" | null;
	globalDiscountValue: number;
	globalDiscountAmount: number;
	totalAmount: number;
	onConfirm: (payload: {
		status: "completed" | "draft";
		payments: TPaymentEntry[];
		discountType: "percentage" | "fixed" | null;
		discountValue: number;
		discountAmount: number;
	}) => void;
	processing: boolean;
};

export function POSCheckoutModal({
	isOpen,
	onClose,
	cart: _cart,
	subtotalAmount,
	globalDiscountType,
	globalDiscountValue,
	globalDiscountAmount: _initialDiscountAmount,
	totalAmount: _initialTotalAmount,
	onConfirm,
	processing,
}: POSCheckoutModalProps) {
	const { t, i18n } = useTranslation();
	const [status, setStatus] = useState<"completed" | "draft">("completed");
	const [discountType, setDiscountType] = useState<
		"percentage" | "fixed" | null
	>(globalDiscountType);
	const [discountValue, setDiscountValue] = useState<number>(
		globalDiscountValue || 0,
	);

	const discountAmount =
		discountType === "percentage"
			? (subtotalAmount * discountValue) / 100
			: discountType === "fixed"
				? discountValue
				: 0;
	const totalAmount = Math.max(0, subtotalAmount - discountAmount);

	const [payments, setPayments] = useState<TPaymentEntry[]>([
		{ method: "cash", amount: totalAmount },
	]);

	useEffect(() => {
		if (isOpen) {
			setStatus("completed");
			setDiscountType(globalDiscountType);
			setDiscountValue(globalDiscountValue || 0);
			setPayments([
				{
					method: "cash",
					amount: Math.max(
						0,
						subtotalAmount -
							(globalDiscountType === "percentage"
								? (subtotalAmount * (globalDiscountValue || 0)) / 100
								: globalDiscountType === "fixed"
									? globalDiscountValue || 0
									: 0),
					),
				},
			]);
		}
	}, [isOpen, subtotalAmount, globalDiscountType, globalDiscountValue]);

	const addPayment = () => {
		setPayments([...payments, { method: "transfer", amount: 0 }]);
	};

	const removePayment = (idx: number) => {
		setPayments(payments.filter((_, i) => i !== idx));
	};

	const updatePayment = (
		idx: number,
		field: "method" | "amount",
		value: string | number,
	) => {
		const newP = [...payments];
		const item = { ...newP[idx] };
		(item as Record<string, unknown>)[field] = value;
		newP[idx] = item as TPaymentEntry;
		setPayments(newP);
	};

	const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
	const shortfall = totalAmount - totalPaid;

	const handleConfirm = () => {
		if (status === "completed" && shortfall > 0) {
			toast.error(t("common.error_title"), {
				description: t("pos.payment_shortfall", {
					amount: formatCurrency(
						shortfall,
						i18n.language as import("@/shared/types/i18n.types").TLanguage,
					),
				}),
			});
			return;
		}

		onConfirm({
			status,
			payments:
				status === "completed" ? payments.filter((p) => p.amount > 0) : [],
			discountType,
			discountValue,
			discountAmount,
		});
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={t("pos.checkout_order")}>
			<div className="space-y-6">
				<div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
					<div className="flex justify-between items-center mb-2">
						<span className="text-neutral-500">{t("pos.subtotal")}</span>
						<span className="font-medium">
							{formatCurrency(
								subtotalAmount,
								i18n.language as import("@/shared/types/i18n.types").TLanguage,
							)}
						</span>
					</div>

					<div className="flex items-center justify-between gap-4 py-3 border-y border-neutral-200 my-3">
						<span className="text-sm font-medium">
							{t("pos.transaction_discount")}
						</span>
						<div className="flex items-center gap-2">
							<Select
								value={discountType || "none"}
								onValueChange={(val: string) => {
									if (val === "none") {
										setDiscountType(null);
										setDiscountValue(0);
									} else {
										setDiscountType(val as "percentage" | "fixed");
										setDiscountValue(0);
									}
								}}
							>
								<SelectTrigger className="w-[130px] h-8 text-xs">
									<SelectValue placeholder={t("pos.select_discount")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">{t("pos.no_discount")}</SelectItem>
									<SelectItem value="percentage">
										{t("commission.percentage_label")}
									</SelectItem>
									<SelectItem value="fixed">
										{t("commission.fixed_label")}
									</SelectItem>
								</SelectContent>
							</Select>
							{discountType && (
								<Input
									type="number"
									min={0}
									className="w-[120px] h-8 text-xs"
									value={discountValue || ""}
									onChange={(e) =>
										setDiscountValue(parseFloat(e.target.value) || 0)
									}
									placeholder={discountType === "percentage" ? "10" : "10000"}
								/>
							)}
						</div>
					</div>

					{discountAmount > 0 && (
						<div className="flex justify-between items-center mb-2 text-rose-500">
							<span>
								{t("pos.discount")} (
								{discountType === "percentage"
									? `${discountValue}%`
									: t("commission.fixed_label")}
								)
							</span>
							<span>
								-{" "}
								{formatCurrency(
									discountAmount,
									i18n.language as import("@/shared/types/i18n.types").TLanguage,
								)}
							</span>
						</div>
					)}
					<div className="flex justify-between items-center text-xl font-bold border-t border-neutral-200 pt-2 mt-2">
						<span>{t("pos.total")}</span>
						<span>
							{formatCurrency(
								totalAmount,
								i18n.language as import("@/shared/types/i18n.types").TLanguage,
							)}
						</span>
					</div>
				</div>

				<div className="space-y-3">
					<label className="text-sm font-bold text-neutral-900">
						{t("pos.save_as")}
					</label>
					<div className="flex gap-4">
						<label className="flex items-center gap-2">
							<input
								type="radio"
								checked={status === "completed"}
								onChange={() => setStatus("completed")}
							/>
							<span className="text-sm">{t("pos.order_completed")}</span>
						</label>
						<label className="flex items-center gap-2">
							<input
								type="radio"
								checked={status === "draft"}
								onChange={() => setStatus("draft")}
							/>
							<span className="text-sm">{t("pos.save_draft_label")}</span>
						</label>
					</div>
				</div>

				{status === "completed" && (
					<div className="space-y-4 border-t border-neutral-200 pt-4">
						<div className="flex justify-between items-center">
							<h3 className="font-bold text-neutral-900">
								{t("pos.payment_method_split")}
							</h3>
							<Button variant="outline" size="sm" onClick={addPayment}>
								{t("pos.add_method")}
							</Button>
						</div>

						{payments.map((p, idx) => (
							<div key={idx} className="flex gap-4 items-center">
								<Select
									value={p.method}
									onValueChange={(val: string) =>
										updatePayment(idx, "method", val)
									}
								>
									<SelectTrigger className="w-[180px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="cash">
											{t("accounting.payment_methods.cash")}
										</SelectItem>
										<SelectItem value="transfer">
											{t("accounting.payment_methods.transfer")}
										</SelectItem>
										<SelectItem value="qris">QRIS</SelectItem>
									</SelectContent>
								</Select>

								<div className="flex-1">
									<Input
										type="number"
										min={0}
										value={p.amount || ""}
										onChange={(e) =>
											updatePayment(
												idx,
												"amount",
												parseInt(e.target.value, 10) || 0,
											)
										}
										placeholder={t("pos.amount_paid_placeholder")}
									/>
								</div>

								{payments.length > 1 && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => removePayment(idx)}
										className="text-rose-500"
									>
										<TrashIcon className="w-4 h-4" />
									</Button>
								)}
							</div>
						))}

						<div className="flex justify-between items-center mt-4 p-4 bg-neutral-100 rounded-lg">
							<span className="font-medium text-neutral-600">
								{t("pos.total_paid")}
							</span>
							<span
								className={`font-bold ${shortfall > 0 ? "text-rose-500" : "text-emerald-600"}`}
							>
								{formatCurrency(
									totalPaid,
									i18n.language as import("@/shared/types/i18n.types").TLanguage,
								)}
							</span>
						</div>
						{shortfall > 0 ? (
							<div className="text-sm text-rose-500 text-right">
								{t("pos.payment_shortfall", {
									amount: formatCurrency(
										shortfall,
										i18n.language as import("@/shared/types/i18n.types").TLanguage,
									),
								})}
							</div>
						) : (
							totalPaid > totalAmount && (
								<div className="text-sm text-emerald-600 text-right font-medium">
									{t("pos.payment_change", {
										amount: formatCurrency(
											totalPaid - totalAmount,
											i18n.language as import("@/shared/types/i18n.types").TLanguage,
										),
									})}
								</div>
							)
						)}
					</div>
				)}

				<div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
					<Button variant="outline" onClick={onClose} disabled={processing}>
						{t("common.cancel")}
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={processing || (status === "completed" && shortfall > 0)}
					>
						{processing ? t("common.processing") : t("pos.confirm_order")}
					</Button>
				</div>
			</div>
		</Modal>
	);
}
