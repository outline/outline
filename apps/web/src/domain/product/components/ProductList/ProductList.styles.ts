export const styles = {
	container: "flex flex-col gap-4 p-4 bg-white",
	title: "text-2xl font-semibold text-neutral-900",
	list: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
	item: "p-4 border border-neutral-200 rounded-lg bg-white transition-all hover:-translate-y-0.5 hover:border-mint-green/30 hover:",
	productName: "text-[14px] font-bold text-neutral-900",
	productSku: "text-[12px] text-neutral-400 mb-2",
	productPrice: "text-[18px] font-medium text-mint-green",
	stockBadge:
		"inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-2",
	lowStock: "bg-amber-100 text-amber-700",
	outOfStock: "bg-rose-100 text-rose-700",
	loading: "text-neutral-900 italic p-8 text-center",
	error: "text-rose-600 p-4 border border-rose-200 rounded-lg bg-rose-50",
} as const;
