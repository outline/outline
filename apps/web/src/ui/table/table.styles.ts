export const styles = {
	wrapper:
		"w-full overflow-x-auto rounded-lg border border-neutral-200 bg-white ",
	table: "w-full text-left border-collapse",
	thead: "bg-white border-b border-neutral-200",
	th: "px-4 py-2.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider select-none whitespace-nowrap",
	tbody: "divide-y divide-neutral-100",
	tr: "group transition-colors hover:bg-neutral-50/50",
	clickable: "cursor-pointer active:bg-neutral-100",
	td: "px-4 py-2.5 text-[12px] text-neutral-600 font-medium whitespace-nowrap",
	align: {
		left: "text-left",
		center: "text-center",
		right: "text-right",
	},
} as const;
