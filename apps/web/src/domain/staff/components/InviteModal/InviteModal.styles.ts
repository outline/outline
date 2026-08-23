export const styles = {
	overlay:
		"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm",
	modal:
		"relative bg-white w-full max-w-lg rounded-lg border border-neutral-200  overflow-hidden",
	header:
		"flex items-center justify-between px-6 py-4 border-b border-neutral-200/80",
	title: "text-[15px] font-bold text-neutral-900",
	subtitle: "text-[13px] text-neutral-500 mt-0.5",
	closeButton:
		"w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors",
	form: "p-6 flex flex-col gap-4",
	field: "flex flex-col gap-1.5",
	label: "block text-[13px] font-medium text-neutral-700",
	input:
		"w-full h-10 px-3 rounded-[8px] border text-[14px] outline-none transition-colors placeholder:text-neutral-400 text-neutral-900 bg-white focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400",
	select:
		"w-full h-10 px-3 rounded-[8px] border text-[14px] outline-none transition-colors bg-white text-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-400",
	roleGrid: "grid grid-cols-2 gap-2",
	roleLabel:
		"flex items-center gap-2.5 p-3 rounded-[8px] border cursor-pointer transition-all",
	roleLabelActive: "border-neutral-900 bg-neutral-50  ring-1 ring-neutral-900",
	roleLabelInactive:
		"border-neutral-200 text-neutral-500 hover:border-neutral-300",
	roleName: "text-[13px] font-bold",
	footer: "flex gap-3 pt-4 border-t border-neutral-100",
	button:
		"flex-1 h-11 rounded-[8px] text-[14px] font-bold transition-colors disabled:opacity-60",
	buttonSecondary:
		"border border-neutral-200 font-medium text-neutral-700 hover:bg-neutral-50",
	buttonPrimary: "",
	errorText: "text-[12px] text-rose-500 mt-1",
	inputError: "border-rose-300",
} as const;
