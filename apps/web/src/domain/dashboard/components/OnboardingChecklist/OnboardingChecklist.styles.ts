export const styles = {
	container:
		"bg-white rounded-[20px] border border-neutral-200/60 overflow-hidden flex flex-col",
	header:
		"px-5 py-4 border-b border-neutral-50 bg-neutral-50/30 flex items-center justify-between",
	title: "text-[11px] font-bold text-neutral-400 uppercase tracking-widest",
	subtitle: "text-[12px] font-bold text-neutral-900 ml-auto mr-4",
	dismissButton:
		"text-[12px] font-bold text-neutral-400 hover:text-neutral-900 transition-colors",

	grid: "p-4 grid grid-cols-1 md:grid-cols-4 gap-3",
	link: "flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-300",
	linkPending:
		"bg-white border-neutral-100 hover:border-mint-green/30 hover:bg-mint-green/5",
	linkDone: "bg-emerald-50/50 border-emerald-100 opacity-60",

	iconContainer:
		"w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
	iconPending: "bg-neutral-100 text-neutral-500",
	iconDone: "bg-emerald-500 text-white",
	iconNumber: "text-[11px] font-bold",

	label: "text-[13px] font-bold tracking-tight",
	labelPending: "text-neutral-600",
	labelDone: "text-emerald-700 line-through decoration-emerald-300",

	progressContainer: "h-1 bg-neutral-50 w-full",
	progressBar:
		"h-full bg-emerald-500 transition-all duration-1000 ease-in-out ",
} as const;
