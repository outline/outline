export const styles = {
	grid: "grid grid-cols-1 md:grid-cols-3 gap-6",
	card: "bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden flex flex-col transition-all hover:border-neutral-300 group",
	cardHeader: "px-4 py-2 flex items-center justify-between bg-transparent",
	cardTitle:
		"text-[12px] font-semibold text-neutral-600 flex items-center gap-2",
	cardIcon: "w-3.5 h-3.5 text-neutral-400/60",

	cardContentWrapper: "flex-1 flex flex-col",
	cardContent:
		"p-4 flex flex-row items-center justify-between gap-4 bg-white border-t border-neutral-200 rounded-t-lg h-full /0",

	metricsArea: "flex flex-col gap-0.5",
	valueLabel: "text-[11px] text-neutral-400 font-bold uppercase tracking-tight",
	valueWrapper: "flex items-baseline gap-2",
	value: "text-[22px] font-bold text-neutral-900 tracking-tighter tabular-nums",
	trend: "flex items-center gap-0.5 text-[11px] font-black tracking-tighter",
	trendUp: "text-emerald-500",
	trendDown: "text-rose-500",

	sparklineWrapper: "w-20 h-10 flex-shrink-0",
	sparkline: "w-full h-full",
} as const;
