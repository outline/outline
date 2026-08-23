export const styles = {
	base: "size-max flex items-center whitespace-nowrap rounded-full ring-1 ring-inset py-0.5 px-2.5 text-sm font-medium",

	variants: {
		default:
			"bg-utility-neutral-50 text-utility-neutral-700 ring-utility-neutral-200",
		secondary:
			"bg-utility-slate-50 text-utility-slate-700 ring-utility-slate-200",
		success:
			"bg-utility-green-50 text-utility-green-700 ring-utility-green-200",
		warning:
			"bg-utility-yellow-50 text-utility-yellow-700 ring-utility-yellow-200",
		error: "bg-utility-red-50 text-utility-red-700 ring-utility-red-200",
		info: "bg-utility-blue-50 text-utility-blue-700 ring-utility-blue-200",
		brand: "bg-utility-brand-50 text-utility-brand-700 ring-utility-brand-200",
		dark: "bg-utility-neutral-900 text-white ring-utility-neutral-900",
	},
} as const;
