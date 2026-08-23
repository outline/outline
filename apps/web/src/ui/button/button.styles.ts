export const styles = {
	base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",

	variants: {
		primary: "bg-mint-green text-white shadow hover:bg-mint-green/90",
		secondary: "bg-neutral-100 text-neutral-900  hover:bg-neutral-200",
		outline:
			"border border-neutral-300 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50 hover:text-neutral-900",
		ghost: "hover:bg-neutral-100 hover:text-neutral-900",
		danger: "bg-rose-600 text-white  hover:bg-rose-700",
		mint: "bg-mint-green text-white  hover:bg-mint-green/90",
	},

	sizes: {
		default: "h-10 px-4 py-2",
		sm: "h-8 rounded-md px-3 text-xs",
		lg: "h-12 rounded-lg px-8 text-base",
		icon: "h-10 w-10",
	},
} as const;
