export const styles = {
	container:
		"w-[380px] flex-shrink-0 flex flex-col bg-white h-full border-l border-neutral-200/80 relative z-10",
	header:
		"p-6 border-b border-neutral-200/80 bg-white/50 flex items-center justify-between",
	title: "text-lg font-bold text-neutral-900 flex items-center gap-2",
	badge:
		"bg-mint-green text-ink-black text-[11px] font-bold px-2 py-0.5 rounded-full",
	clearButton:
		"text-[12px] font-medium text-neutral-400 hover:text-rose-500 transition-colors",
	content: "flex-1 overflow-y-auto p-6",
	cartItem:
		"flex gap-4 p-3 rounded-lg border border-neutral-100 bg-white animate-in slide-in-from-right-2 duration-300",
	itemInfo: "flex-1",
	itemName: "font-semibold text-[13px] text-neutral-900 line-clamp-1",
	itemPrice: "text-[12px] font-medium text-emerald-600 mt-1",
	quantityControl:
		"flex items-center bg-neutral-100 rounded-lg border border-neutral-200 p-0.5",
	qtyButton:
		"w-6 h-6 flex items-center justify-center text-neutral-600 hover:bg-white rounded-md transition-all",
	qtyValue: "w-6 text-center text-[12px] font-bold",
	removeButton:
		"w-8 h-8 flex items-center justify-center text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all",
	footer: "p-6 border-t border-neutral-200/80 bg-white/50 space-y-4",
	totals: "space-y-2",
	subtotalRow: "flex justify-between text-[13px] text-neutral-500",
	totalRow: "flex justify-between items-center",
	totalLabel: "text-[14px] font-bold text-neutral-900",
	totalValue: "text-2xl font-bold text-emerald-600 tracking-tight",
	paymentLabel:
		"text-[12px] font-bold text-neutral-400 uppercase tracking-widest block mb-2",
	paymentGrid: "grid grid-cols-3 gap-2",
	paymentButton:
		"flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-[12px] font-medium transition-all",
	paymentActive: "border-emerald-500 bg-emerald-50 text-emerald-700",
	paymentInactive:
		"border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300",
	checkoutButton:
		"w-full h-14 text-base font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-6 active:scale-[0.98]",
	shortcut:
		"hidden sm:inline-flex h-6 items-center gap-1 rounded bg-white/10 border border-white/10 px-2 font-mono text-[10px] font-medium text-white/50",
} as const;
