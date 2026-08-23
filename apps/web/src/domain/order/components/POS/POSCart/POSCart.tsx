import { useState } from "react";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import {
	CloseCircleLinear as CloseIcon,
	AddCircleLinear as PlusIcon,
} from "solar-icon-set";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/shared/i18n";
import { cn } from "@/shared/utils";
import { formatCurrency } from "@/shared/utils/format";
import { Button, EmptyState } from "@/ui";
import type { TCartItem } from "../../../hooks/usePOSCart";
import { styles } from "./POSCart.styles";

export type TPOSCartProps = {
	readonly cart: readonly TCartItem[];
	readonly customerId: string | null;
	readonly customers: readonly {
		id: string;
		name: string;
		phone?: string | null;
	}[];
	readonly totalAmount: number;
	readonly processing: boolean;
	readonly onUpdateQuantity: (cartKey: string, delta: number) => void;
	readonly onSetItemDiscount: (
		cartKey: string,
		type: "percentage" | "fixed" | null,
		value: number,
	) => void;
	readonly onRemove: (cartKey: string) => void;
	readonly onClear: () => void;
	readonly onSetCustomerId: (id: string | null) => void;
	readonly onCreateCustomer: (fullName: string, phone: string) => Promise<void>;
	readonly onSaveDraft: () => void;
	readonly onCheckout: () => void;
};

export const POSCart = ({
	cart,
	customerId,
	customers,
	totalAmount,
	processing,
	onUpdateQuantity,
	onSetItemDiscount,
	onRemove,
	onClear,
	onSetCustomerId,
	onCreateCustomer,
	onSaveDraft,
	onCheckout,
}: TPOSCartProps) => {
	const { language } = useLanguage();
	const { t } = useTranslation();

	const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
	const [newCustomer, setNewCustomer] = useState({ fullName: "", phone: "" });
	const [savingCustomer, setSavingCustomer] = useState(false);

	const handleSaveCustomer = async () => {
		if (!newCustomer.fullName.trim() || !newCustomer.phone.trim()) return;
		setSavingCustomer(true);
		try {
			await onCreateCustomer(
				newCustomer.fullName.trim(),
				newCustomer.phone.trim(),
			);
			setIsAddCustomerOpen(false);
			setNewCustomer({ fullName: "", phone: "" });
		} finally {
			setSavingCustomer(false);
		}
	};

	const [editingDiscountItem, setEditingDiscountItem] =
		useState<TCartItem | null>(null);
	const [discountFormType, setDiscountFormType] = useState<
		"percentage" | "fixed"
	>("percentage");
	const [discountFormValue, setDiscountFormValue] = useState<string>("");

	const handleOpenDiscount = (item: TCartItem) => {
		setEditingDiscountItem(item);
		if (item.discountType) {
			setDiscountFormType(item.discountType);
			setDiscountFormValue(item.discountValue.toString());
		} else {
			setDiscountFormType("percentage");
			setDiscountFormValue("");
		}
	};

	const handleApplyItemDiscount = () => {
		if (editingDiscountItem) {
			const val = parseFloat(discountFormValue) || 0;
			if (val > 0) {
				onSetItemDiscount(editingDiscountItem.cartKey, discountFormType, val);
			} else {
				onSetItemDiscount(editingDiscountItem.cartKey, null, 0);
			}
			setEditingDiscountItem(null);
		}
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2 className={styles.title}>
					{t("pos.new_order")}
					<span className={styles.badge}>{cart.length}</span>
				</h2>
				<Button
					variant="ghost"
					size="sm"
					onClick={onClear}
					className={styles.clearButton}
				>
					{t("pos.clear")}
				</Button>
			</div>
			<div className="px-5 pb-4 border-b border-neutral-200/80 flex gap-2 items-center">
				<div className="flex-1">
					<Select
						options={customers.map((c) => ({
							value: c.id,
							label: c.name + (c.phone ? ` (${c.phone})` : ""),
						}))}
						value={
							customerId
								? {
										value: customerId,
										label:
											customers.find((c) => c.id === customerId)?.name || "",
									}
								: null
						}
						onChange={(opt) => onSetCustomerId(opt?.value || null)}
						placeholder={t(
							"customer.select_customer",
							"Pilih Pelanggan (Opsional)",
						)}
						className="text-sm"
						isClearable
						styles={{
							control: (base) => ({
								...base,
								borderRadius: "8px",
								borderColor: "#e5e5e5",
								boxShadow: "none",
								"&:hover": { borderColor: "#10b981" },
							}),
						}}
					/>
				</div>
				<Button
					variant="outline"
					size="icon"
					onClick={() => setIsAddCustomerOpen(true)}
					className="h-9 w-9 shrink-0 rounded-lg border-neutral-200 text-neutral-500 hover:text-mint-green hover:border-mint-green"
					title={t("customer.add_customer", "Tambah Pelanggan Baru")}
					aria-label={t("customer.add_customer", "Tambah Pelanggan Baru")}
				>
					<PlusIcon className="w-4 h-4" />
				</Button>
			</div>

			<Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>
							{t("customer.add_customer", "Tambah Pelanggan Baru")}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<label
								htmlFor="pos-new-customer-name"
								className="text-sm font-medium text-neutral-700"
							>
								{t("customers.table.name", "Nama")}
							</label>
							<Input
								id="pos-new-customer-name"
								value={newCustomer.fullName}
								onChange={(e) =>
									setNewCustomer((prev) => ({
										...prev,
										fullName: e.target.value,
									}))
								}
								placeholder={t("customer.name_placeholder", "Nama pelanggan")}
							/>
						</div>
						<div className="space-y-2">
							<label
								htmlFor="pos-new-customer-phone"
								className="text-sm font-medium text-neutral-700"
							>
								{t("customers.table.phone", "No. HP")}
							</label>
							<Input
								id="pos-new-customer-phone"
								type="tel"
								value={newCustomer.phone}
								onChange={(e) =>
									setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))
								}
								placeholder="0812xxxxxxx"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsAddCustomerOpen(false)}
							disabled={savingCustomer}
						>
							{t("common.cancel", "Batal")}
						</Button>
						<Button
							onClick={handleSaveCustomer}
							disabled={
								savingCustomer ||
								!newCustomer.fullName.trim() ||
								!newCustomer.phone.trim()
							}
						>
							{savingCustomer
								? t("common.saving", "Menyimpan...")
								: t("common.save", "Simpan")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className={styles.content}>
				{cart.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center">
						<EmptyState
							variant="pos"
							title={t("pos.empty_cart")}
							className="border-none p-0 bg-transparent"
						/>
					</div>
				) : (
					<div className="space-y-4">
						{cart.map((item) => (
							<div key={item.cartKey} className={styles.cartItem}>
								<div className={styles.itemInfo}>
									<div className={styles.itemName}>
										{item.productName}
										{item.variantName && (
											<span className="text-[11px] text-neutral-400 ml-1">
												({item.variantName})
											</span>
										)}
									</div>
									<div className={styles.itemPrice}>
										{item.discountAmount > 0 ? (
											<div className="flex flex-col">
												<span className="line-through text-neutral-400 text-[10px]">
													{formatCurrency(item.price, language)}/{item.unit}
												</span>
												<span className="text-emerald-600 font-medium">
													{formatCurrency(
														item.price -
															item.discountAmount / item.cartQuantity,
														language,
													)}
													/{item.unit}
												</span>
											</div>
										) : (
											<span>
												{formatCurrency(item.price, language)}/{item.unit}
											</span>
										)}
									</div>
								</div>
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleOpenDiscount(item)}
										className="h-7 w-7 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full"
										title="Set Diskon Item"
									>
										<span className="text-xs font-bold">%</span>
									</Button>
									<div className={styles.quantityControl}>
										<Button
											variant="outline"
											size="icon"
											onClick={() =>
												onUpdateQuantity(
													item.cartKey,
													item.isFractional ? -0.1 : -1,
												)
											}
											className={styles.qtyButton}
										>
											-
										</Button>
										<span className={styles.qtyValue}>
											{item.isFractional
												? `${item.cartQuantity} ${item.unit}`
												: item.cartQuantity}
										</span>
										<Button
											variant="outline"
											size="icon"
											onClick={() =>
												onUpdateQuantity(
													item.cartKey,
													item.isFractional ? 0.1 : 1,
												)
											}
											className={styles.qtyButton}
										>
											+
										</Button>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => onRemove(item.cartKey)}
										className={styles.removeButton}
									>
										<CloseIcon className="w-4 h-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className={styles.footer}>
				<div className={styles.totals}>
					<div className={styles.subtotalRow}>
						<span>{t("common.subtotal")}</span>
						<span>{formatCurrency(totalAmount, language)}</span>
					</div>
					<div className={styles.totalRow}>
						<span className={styles.totalLabel}>{t("common.total")}</span>
						<span className={styles.totalValue}>
							{formatCurrency(totalAmount, language)}
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Button
						variant="outline"
						onClick={onSaveDraft}
						disabled={cart.length === 0 || processing}
						className="w-full text-neutral-600 bg-white"
					>
						Simpan Draft
					</Button>
					<Button
						variant="primary"
						onClick={onCheckout}
						disabled={cart.length === 0 || processing}
						className={styles.checkoutButton}
					>
						<span className="flex items-center gap-2">
							<PlusIcon className="w-5 h-5 text-mint-green" />
							{processing ? t("common.processing") : "Checkout / Pembayaran"}
						</span>
						<kbd className={styles.shortcut}>
							<span className="text-xs">⌘</span>Enter
						</kbd>
					</Button>
				</div>
			</div>

			<Dialog
				open={!!editingDiscountItem}
				onOpenChange={(open) => !open && setEditingDiscountItem(null)}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>Diskon Per Item</DialogTitle>
					</DialogHeader>
					{editingDiscountItem && (
						<div className="py-4 space-y-4">
							<div className="text-sm text-neutral-600">
								Produk:{" "}
								<span className="font-medium text-neutral-900">
									{editingDiscountItem.productName}
								</span>
							</div>
							<div className="flex bg-neutral-100 p-1 rounded-lg">
								<button
									className={cn(
										"flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
										discountFormType === "percentage"
											? "bg-white shadow-sm text-neutral-900"
											: "text-neutral-500",
									)}
									onClick={() => setDiscountFormType("percentage")}
								>
									Persen (%)
								</button>
								<button
									className={cn(
										"flex-1 text-sm font-medium py-1.5 rounded-md transition-colors",
										discountFormType === "fixed"
											? "bg-white shadow-sm text-neutral-900"
											: "text-neutral-500",
									)}
									onClick={() => setDiscountFormType("fixed")}
								>
									Nominal (Rp)
								</button>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
									Nilai Diskon{" "}
									{discountFormType === "percentage" ? "(%)" : "(Rp)"}
								</label>
								<Input
									type="number"
									min="0"
									placeholder={
										discountFormType === "percentage"
											? "Contoh: 10"
											: "Contoh: 5000"
									}
									value={discountFormValue}
									onChange={(e) => setDiscountFormValue(e.target.value)}
									className="text-right font-medium text-lg"
								/>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditingDiscountItem(null)}
						>
							Batal
						</Button>
						<Button
							className="bg-emerald-600 hover:bg-emerald-700 text-white"
							onClick={handleApplyItemDiscount}
						>
							Terapkan
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};
