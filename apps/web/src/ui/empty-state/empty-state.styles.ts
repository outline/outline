export const styles = {
	container:
		"flex flex-col items-center justify-center p-12 text-center bg-white border border-dashed border-neutral-200 rounded-lg animate-in fade-in zoom-in-95 duration-500",
	visualWrapper: "mb-8 flex items-center justify-center",
	illustration: "w-40 h-40 object-contain mix-blend-multiply opacity-90",
	iconWrapper:
		"w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center",
	icon: "w-8 h-8 text-neutral-400",
	placeholderVisual:
		"w-40 h-40 bg-neutral-50 rounded-lg flex items-center justify-center",
	content: "flex flex-col gap-2 max-w-sm",
	title: "text-[20px] font-bold text-neutral-900 tracking-tight",
	description: "text-[14px] text-neutral-500 leading-relaxed px-4",
	action: "mt-8",
} as const;
