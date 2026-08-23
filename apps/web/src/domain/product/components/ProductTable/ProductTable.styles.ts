export const styles = {
	tableContainer:
		"bg-white rounded-lg border border-neutral-200  overflow-hidden overflow-x-auto",
	table: "w-full text-left text-[13px] border-collapse",
	thead:
		"bg-white text-neutral-400 text-[11px] uppercase font-bold tracking-widest border-b border-neutral-200",
	th: "px-6 py-4",
	tr: "hover:bg-neutral-50/50 transition-colors group border-b border-neutral-100 last:border-0",
	td: "px-6 py-5",
	productName: "font-bold text-neutral-900 text-[14px]",
	productSku: "text-neutral-500 font-medium",
	price: "text-right font-bold text-neutral-900",
	stock: "text-right",
	badge:
		"px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap",
	badgeNormal: "bg-blue-50 text-blue-700",
	badgeLow: "bg-amber-100 text-amber-700",
	badgeEmpty: "bg-rose-100 text-rose-700",
	actionGroup:
		"flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all",
	iconButton:
		"p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all",
	deleteButton: "hover:text-rose-500 hover:bg-rose-50",
} as const;
