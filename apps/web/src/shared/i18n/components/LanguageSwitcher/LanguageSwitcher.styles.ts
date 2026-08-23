export const styles = {
	trigger:
		"w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-[10px] font-bold text-neutral-600 hover:bg-neutral-50 transition-colors uppercase ",
	dropdownContent:
		"w-40 rounded-lg border border-neutral-200  p-1 animate-in fade-in zoom-in-95 duration-200",
	item: "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors focus:bg-neutral-100 outline-none",
	itemLabel: "text-[12px] font-bold text-neutral-900 uppercase tracking-tight",
	itemCheck: "w-3.5 h-3.5 text-mint-green",
} as const;
