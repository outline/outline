import { useState } from "react";
import { CloseCircleLinear as CloseIcon } from "solar-icon-set";
import type { TProductDto, TProductVariantDto } from "@/domain/product";
import { formatCurrency } from "@/shared/utils";

export type TVariantPickerProps = {
	readonly product: TProductDto;
	readonly onSelect: (
		product: TProductDto,
		variant: TProductVariantDto,
		qty: number,
	) => void;
	readonly onClose: () => void;
};

export const VariantPicker = ({
	product,
	onSelect,
	onClose,
}: TVariantPickerProps) => {
	const [selectedVariant, setSelectedVariant] =
		useState<TProductVariantDto | null>(null);
	const [qty, setQty] = useState<number>(1);
	const [fractionalInput, setFractionalInput] = useState("");

	const activeVariants = product.variants.filter((v) => v.isActive);
	const isFractionalVariant = selectedVariant?.isFractional ?? false;

	const handleVariantSelect = (v: TProductVariantDto) => {
		setSelectedVariant(v);
		if (!v.isFractional) {
			setQty(1);
		} else {
			setFractionalInput("");
		}
	};

	const handleConfirm = () => {
		if (!selectedVariant) return;
		const finalQty = isFractionalVariant
			? parseFloat(fractionalInput || "0")
			: qty;
		if (finalQty <= 0) return;
		onSelect(product, selectedVariant, finalQty);
		onClose();
	};

	const totalPrice = selectedVariant
		? selectedVariant.price *
			(isFractionalVariant ? parseFloat(fractionalInput || "0") : qty)
		: 0;

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
			{/* Overlay */}
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Sheet */}
			<div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
					<div>
						<p className="text-[15px] font-bold text-neutral-900">
							{product.name}
						</p>
						{product.brand && (
							<p className="text-[12px] text-neutral-400">{product.brand}</p>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors rounded-lg"
					>
						<CloseIcon className="w-5 h-5" />
					</button>
				</div>

				{/* Variant Grid */}
				<div className="flex-1 overflow-y-auto px-5 py-4">
					<p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-3">
						Pilih Varian
					</p>
					<div className="grid grid-cols-2 gap-2">
						{activeVariants.map((v) => (
							<button
								key={v.id}
								type="button"
								onClick={() => handleVariantSelect(v)}
								className={`p-3 rounded-xl border-2 text-left transition-all ${
									selectedVariant?.id === v.id
										? "border-neutral-900 bg-neutral-900 text-white"
										: "border-neutral-200 hover:border-neutral-400"
								}`}
							>
								<p className="text-[13px] font-bold">{v.name}</p>
								<p
									className={`text-[12px] mt-0.5 ${
										selectedVariant?.id === v.id
											? "text-neutral-300"
											: "text-neutral-500"
									}`}
								>
									{formatCurrency(v.price)}/{v.unit}
								</p>
								<p
									className={`text-[11px] mt-1 ${
										v.stock <= 0
											? "text-red-400"
											: v.isLowStock
												? "text-amber-500"
												: selectedVariant?.id === v.id
													? "text-neutral-400"
													: "text-neutral-400"
									}`}
								>
									Stok: {v.stock} {v.unit}
								</p>
							</button>
						))}
					</div>

					{/* Qty / Fractional input */}
					{selectedVariant && (
						<div className="mt-5">
							<p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
								{isFractionalVariant
									? `Jumlah (${selectedVariant.unit})`
									: "Jumlah"}
							</p>
							{isFractionalVariant ? (
								<div className="flex items-center gap-2">
									<input
										type="number"
										step="0.1"
										min="0.1"
										value={fractionalInput}
										onChange={(e) => setFractionalInput(e.target.value)}
										placeholder={`0 ${selectedVariant.unit}`}
										className="flex-1 h-10 border border-neutral-200 rounded-lg px-3 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900"
									/>
									<span className="text-[13px] text-neutral-500 font-medium">
										{selectedVariant.unit}
									</span>
								</div>
							) : (
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={() => setQty((q) => Math.max(1, q - 1))}
										className="w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center text-[16px] font-bold hover:bg-neutral-50"
									>
										−
									</button>
									<span className="text-[18px] font-bold w-10 text-center">
										{qty}
									</span>
									<button
										type="button"
										onClick={() =>
											setQty((q) => Math.min(selectedVariant.stock, q + 1))
										}
										className="w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center text-[16px] font-bold hover:bg-neutral-50"
									>
										+
									</button>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-5 py-4 border-t border-neutral-100">
					{selectedVariant && (
						<p className="text-[12px] text-neutral-500 mb-2 text-right">
							Total:{" "}
							<span className="text-[14px] font-bold text-neutral-900">
								{formatCurrency(totalPrice)}
							</span>
						</p>
					)}
					<button
						type="button"
						onClick={handleConfirm}
						disabled={
							!selectedVariant ||
							(isFractionalVariant
								? parseFloat(fractionalInput || "0") <= 0
								: qty <= 0)
						}
						className="w-full h-11 bg-neutral-900 text-white text-[14px] font-bold rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Tambah ke Keranjang
					</button>
				</div>
			</div>
		</div>
	);
};
