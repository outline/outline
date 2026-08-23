export const styles = {
	badge:
		"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
	icon: "w-3 h-3",
	label: "leading-none",
	types: {
		success: "bg-emerald-50 text-emerald-600 border border-emerald-100",
		warning: "bg-amber-50 text-amber-600 border border-amber-100",
		error: "bg-rose-50 text-rose-600 border border-rose-100",
		info: "bg-blue-50 text-blue-600 border border-blue-100",
		neutral: "bg-neutral-50 text-neutral-600 border border-neutral-100",
	},
} as const;
