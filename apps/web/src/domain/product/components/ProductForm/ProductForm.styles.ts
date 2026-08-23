export const styles = {
	form: "bg-white p-6 rounded-lg border border-neutral-200  flex flex-col gap-6",
	grid: "grid grid-cols-1 md:grid-cols-4 gap-6 items-end",
	field: "flex flex-col gap-2",
	label:
		"text-[12px] font-bold text-neutral-400 uppercase tracking-widest ml-1",
	input:
		"w-full h-11 px-3 rounded-lg border border-neutral-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all",
	actions: "mt-6 flex justify-end gap-3",
	button:
		"h-11 px-6 rounded-lg text-[14px] font-bold transition-all active:scale-95",
	buttonCancel:
		"border border-neutral-200 text-neutral-600 hover:bg-neutral-50",
	buttonSubmit: "px-8  disabled:opacity-50",
	error: "text-rose-600 text-[12px] font-medium mt-1 ml-1",
} as const;
