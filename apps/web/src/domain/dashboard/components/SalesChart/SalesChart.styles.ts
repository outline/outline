export const styles = {
	container:
		"bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden flex flex-col h-full",
	header: "px-4 py-2 flex items-center justify-between bg-transparent",
	title: "text-[12px] font-semibold text-neutral-600 flex items-center gap-2",
	icon: "w-3.5 h-3.5 text-neutral-400/60",
	detailLink:
		"text-[11px] font-bold text-mint-green hover:underline cursor-pointer",

	contentWrapper: "flex-1 flex flex-col",
	content:
		"p-4 flex flex-col gap-4 bg-white border-t border-neutral-200 rounded-t-lg h-full /0",

	list: "divide-y divide-neutral-100",
	item: "py-2.5 flex items-center justify-between group",
	itemInfo: "flex items-center gap-3",
	itemVisual: "w-3.5 h-3.5 rounded-full border-2 border-emerald-500",
	itemName: "text-[13px] font-semibold text-neutral-900 tracking-tight",

	sparklineArea: "flex items-center gap-4",
	value: "text-[12px] font-bold text-neutral-900 tabular-nums",
	sparklineWrapper: "w-14 h-5",
	sparkline: "w-full h-full",

	footer: "px-4 py-2 flex items-center justify-between bg-transparent",
	footerLabel: "text-[11px] text-neutral-500 font-medium",
	footerValue: "text-[11px] font-black text-neutral-900",
} as const;
