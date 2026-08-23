export const styles = {
	overlay:
		"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm",
	modal:
		"relative bg-white w-full max-w-md rounded-lg border border-neutral-200  overflow-hidden",
	header:
		"flex items-center justify-between px-6 py-5 border-b border-neutral-100",
	title: "text-[16px] font-bold text-neutral-900 tracking-tight",
	subtitle: "text-[13px] text-neutral-500 mt-0.5",
	closeButton:
		"w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors",
	form: "p-6 flex flex-col gap-5",
	field: "flex flex-col gap-1.5",
	label: "text-[13px] font-semibold text-neutral-800 ml-1",
	input:
		"w-full h-11 px-4 rounded-lg border border-neutral-200 text-[14px] outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-400 transition-all placeholder:text-neutral-400 text-neutral-900 bg-white",
	textarea:
		"w-full px-4 py-3 rounded-lg border border-neutral-200 text-[14px] outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-400 transition-all placeholder:text-neutral-400 text-neutral-900 bg-white resize-none",
	phoneInputContainer: "relative",
	phoneIcon:
		"absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400",
	phoneInput: "pl-10",
	footer: "flex gap-3 pt-4 border-t border-neutral-100",
	button:
		"flex-1 h-11 rounded-lg text-[14px] font-bold transition-all flex items-center justify-center gap-2",
	buttonSecondary:
		"border border-neutral-200 font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300",
	buttonPrimary: " disabled:opacity-60",
	loading:
		"w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin",
	errorText: "text-[12px] text-rose-500 font-medium ml-1 mt-1",
	inputError: "border-rose-300 focus:border-rose-400",
} as const;
