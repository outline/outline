export const styles = {
	container:
		"bg-white border border-neutral-200/80 rounded-lg  overflow-hidden",
	list: "divide-y divide-neutral-200/80",
	item: "flex items-center justify-between p-5 hover:bg-neutral-50 transition-colors group relative",
	link: "absolute inset-0 z-0",
	content: "flex items-center gap-4 relative z-10 pointer-events-none",
	iconContainer:
		"w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0",
	icon: "w-5 h-5 text-neutral-500",
	info: "flex flex-col gap-1",
	titleRow: "text-[14px] font-bold text-neutral-900 flex items-center gap-2",
	statusBadge:
		"px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider",
	statusActive: "bg-emerald-100 text-emerald-700",
	statusCompleted: "bg-neutral-100 text-neutral-600",
	statusCancelled: "bg-rose-100 text-rose-700",
	statusDraft: "bg-amber-100 text-amber-700",
	metaRow:
		"text-[13px] text-neutral-500 flex flex-wrap items-center gap-y-1 gap-x-3",
	metaItem: "flex items-center gap-1.5",
	dot: "w-1 h-1 rounded-full bg-neutral-300",
	actions: "flex items-center gap-3 relative z-10",
	contactInfo: "hidden md:block text-right pr-4 border-r border-neutral-100",
	contactLabel:
		"text-[11px] font-medium text-neutral-400 uppercase tracking-tight",
	contactValue: "text-[13px] text-neutral-600",
	iconButtons: "flex items-center gap-1",
	deleteButton:
		"w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100",
	chevron:
		"w-5 h-5 text-neutral-400 group-hover:text-neutral-900 transition-colors",
	loading: "space-y-4 p-6",
	loadingItem: "h-20 bg-neutral-100 rounded-lg animate-pulse",
} as const;
