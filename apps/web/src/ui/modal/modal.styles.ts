export const styles = {
	overlay:
		"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200",
	modal:
		"relative bg-white w-full max-w-md rounded-lg border border-neutral-200  overflow-hidden animate-in zoom-in-95 duration-200",
	header:
		"flex items-center justify-between px-6 py-5 border-b border-neutral-100",
	title: "text-[16px] font-bold text-neutral-900 tracking-tight",
	subtitle: "text-[13px] text-neutral-500 mt-0.5",
	closeButton:
		"w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors",
	body: "p-6",
} as const;
