export const styles = {
	container: "flex flex-col h-full",
	grid: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6",
	productCard:
		"flex flex-col items-start justify-start text-left whitespace-normal h-auto p-4 rounded-lg border bg-white transition-all group active:scale-[0.98]",
	activeCard: "border-neutral-200 hover:border-mint-green cursor-pointer",
	disabledCard:
		"opacity-50 border-neutral-200 cursor-not-allowed bg-neutral-50",
	name: "font-semibold text-neutral-900 line-clamp-2 mb-1 text-[14px]",
	sku: "text-[12px] text-neutral-400 mb-4",
	footer: "mt-auto space-y-2",
	price: "font-bold text-neutral-900 text-[15px]",
	badge:
		"text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block",
	badgeNormal: "bg-neutral-100 text-neutral-600",
	badgeLow: "bg-amber-100 text-amber-700",
	badgeEmpty: "bg-rose-100 text-rose-700",
} as const;
