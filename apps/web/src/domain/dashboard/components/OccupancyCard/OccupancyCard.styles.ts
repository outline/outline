export const styles = {
	container:
		"bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden flex flex-col h-full",
	header: "px-4 py-2 flex items-center justify-between bg-transparent",
	title: "text-[12px] font-semibold text-neutral-600 flex items-center gap-2",
	icon: "w-3.5 h-3.5 text-neutral-400/60",

	contentWrapper: "flex-1 flex flex-col",
	content:
		"p-4 flex flex-col gap-4 bg-white border-t border-neutral-200 rounded-t-lg h-full /0",

	list: "divide-y divide-neutral-100",
	item: "py-2.5 flex items-center justify-between group",
	itemInfo: "flex items-center gap-3",
	itemVisual:
		"w-7 h-7 rounded bg-neutral-50 flex items-center justify-center border border-neutral-100",
	itemIcon: "w-3 h-3 text-neutral-400",
	itemName: "text-[13px] font-semibold text-neutral-900 tracking-tight",
	itemMeta: "text-[11px] text-neutral-400 font-medium",

	itemStatusWrapper: "flex items-center gap-4",
	timestamp: "text-[11px] text-neutral-400 font-medium",
	itemAction:
		"w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-900 transition-colors cursor-pointer",

	footer: "px-4 py-2 flex items-center justify-between bg-transparent",
	footerText: "text-[11px] text-neutral-500 font-medium",
	footerLink: "text-[11px] font-bold text-mint-green hover:underline",
} as const;
