export const styles = {
	form: "flex flex-col gap-6",
	grid: "grid grid-cols-1 md:grid-cols-2 gap-6",
	field: "flex flex-col gap-2",
	label: "text-[13px] font-semibold text-neutral-800",
	input:
		"w-full h-10 px-3 rounded-lg border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400 transition-all",
	switchContainer:
		"flex items-center justify-between p-3 rounded-lg border border-neutral-100 bg-neutral-50/50",
	switchLabel: "flex flex-col",
	switchTitle: "text-[14px] font-bold text-neutral-900",
	switchDesc: "text-[12px] text-neutral-500",
} as const;
