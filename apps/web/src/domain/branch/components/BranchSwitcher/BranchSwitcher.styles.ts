export const styles = {
	trigger:
		"flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors text-left w-full",
	icon: "w-4 h-4 text-neutral-500",
	content: "flex-1 min-w-0",
	businessLabel:
		"text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-0.5",
	branchName: "text-[12px] font-bold text-neutral-900 truncate leading-tight",
	chevron: "w-4 h-4 text-neutral-400 transition-transform",
	dropdownContent:
		"w-56 rounded-lg border border-neutral-200  p-1 animate-in fade-in zoom-in-95 duration-200",
	item: "flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors focus:bg-neutral-100 outline-none",
	itemName: "text-[13px] font-semibold text-neutral-900",
	itemCheck: "w-4 h-4 text-mint-green ml-auto",
	noBranch: "px-3 py-2 text-[12px] text-neutral-500 italic",
} as const;
