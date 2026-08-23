export const styles = {
	container: "flex flex-col gap-4",
	header: "flex justify-between items-center",
	title: "text-lg font-bold text-neutral-900",
	list: "flex flex-col gap-3",
	card: "bg-white rounded-lg border border-neutral-200 p-4 ",
	cardHeader: "flex justify-between items-start mb-2",
	templateName: "font-bold text-neutral-900",
	categoryBadge:
		"text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-bold uppercase tracking-widest",
	content: "text-sm text-neutral-600 bg-neutral-50 rounded-lg p-3 font-mono",
	variables: "mt-2 flex gap-1 flex-wrap",
	variable:
		"text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-bold",
} as const;
