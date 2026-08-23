export const styles = {
	card: "bg-white rounded-lg border p-6 transition-all group relative overflow-hidden flex flex-col gap-8",
	cardActive:
		"border-neutral-200/80  hover:border-mint-green/30 hover: hover:-green/5",
	cardInactive: "border-neutral-100 opacity-80 grayscale-[0.5] ",
	header: "flex items-start justify-between",
	info: "flex items-center gap-4",
	iconContainer:
		"w-14 h-14 rounded-lg flex items-center justify-center border  transition-all duration-500 bg-neutral-50 border-neutral-100",
	icon: "h-7 w-7 text-neutral-700 transition-colors duration-500",
	iconContainerHover:
		"group-hover:bg-mint-green group-hover:border-mint-green group-hover:rotate-6",
	iconHover: "group-hover:text-white",
	name: "text-[16px] font-bold text-neutral-900 leading-none tracking-tight",
	statusBadge:
		"px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-2",
	statusActive: "bg-emerald-50 text-emerald-600",
	statusInactive: "bg-neutral-100 text-neutral-500",
	pulse: "w-1 h-1 rounded-full bg-emerald-500 animate-pulse",
	actions:
		"flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300",
	iconButton:
		"w-9 h-9 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all active:scale-90",
	iconButtonDanger: "hover:text-rose-600 hover:bg-rose-50",
	details: "space-y-4 pt-6 border-t border-neutral-50",
	detailItem: "flex items-start gap-3.5 text-[14px] text-neutral-600",
	detailIcon:
		"w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center shrink-0 border border-neutral-100",
	detailIconSvg: "h-4 w-4 text-neutral-400",
	addressText: "leading-relaxed py-1",
	phoneText: "font-semibold py-1",
	footer:
		"mt-8 pt-4 border-t border-neutral-50 flex justify-between items-center text-[10px] text-neutral-400 font-mono tracking-tighter",
	branchId:
		"uppercase opacity-40 hover:text-neutral-600 transition-colors cursor-help",
} as const;
