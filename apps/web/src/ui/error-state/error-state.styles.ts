export const styles = {
	container:
		"flex flex-col items-center justify-center p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700",
	visualWrapper: "mb-8 flex items-center justify-center",
	illustration: "w-48 h-48 object-contain mix-blend-multiply opacity-90",
	iconWrapper:
		"w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6",
	icon: "w-10 h-10 text-rose-500",
	content: "flex flex-col gap-3 max-w-lg",
	title: "text-[24px] font-bold text-neutral-900 tracking-tight",
	description: "text-[15px] text-neutral-500 leading-relaxed px-6",
	errorDetail:
		"mt-4 p-4 rounded-lg bg-neutral-50 border border-neutral-100 text-[12px] font-mono text-neutral-400 text-left overflow-auto max-h-32 w-full",
	retryButton: "mt-10 h-12 px-8 rounded-lg text-base font-bold",
} as const;
