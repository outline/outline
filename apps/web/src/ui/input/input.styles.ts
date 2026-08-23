export const styles = {
	container: "flex flex-col gap-1.5 w-full",
	label: "text-[13px] font-semibold text-neutral-800 ml-1",
	input:
		"flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm  transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50",
	error: "text-[12px] text-rose-500 font-medium ml-1 mt-1",
	inputError: "border-rose-300 focus:border-rose-400",
} as const;
