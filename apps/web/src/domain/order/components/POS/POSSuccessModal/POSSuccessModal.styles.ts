export const styles = {
	dialog: "sm:max-w-[400px] p-0 overflow-hidden border-none ",
	header: "bg-emerald-600 p-8 text-white text-center space-y-4",
	iconContainer:
		"w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto",
	icon: "w-10 h-10 text-white",
	title: "text-2xl font-bold text-white tracking-tight",
	subtitle: "text-white/80 text-[14px]",
	body: "p-6 bg-white space-y-6",
	summaryLabel:
		"text-[12px] font-bold text-neutral-400 uppercase tracking-widest",
	summaryList: "max-h-[120px] overflow-y-auto space-y-2 pr-2",
	summaryItem: "flex justify-between text-[13px]",
	itemName: "text-neutral-600 line-clamp-1",
	itemValue: "font-medium text-neutral-900",
	totalContainer:
		"pt-3 border-t border-neutral-100 flex justify-between items-center",
	totalLabel: "text-[14px] font-bold text-neutral-900",
	totalValue: "text-[18px] font-bold text-emerald-600",
	actionsGrid: "grid grid-cols-2 gap-3",
	actionButton:
		"flex items-center justify-center gap-2 h-10 rounded-lg border text-[13px] font-medium transition-colors",
	printButton: "border-neutral-200 text-neutral-700 hover:bg-neutral-50",
	waButton:
		"border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
	newTransaction: "w-full h-11 rounded-lg font-bold text-[14px] ",
} as const;
