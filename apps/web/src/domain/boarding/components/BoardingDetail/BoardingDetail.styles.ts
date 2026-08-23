export const styles = {
	container: "flex flex-col min-h-full",
	breadcrumb:
		"border-b border-neutral-200/80 px-5 py-3 bg-white flex-shrink-0 flex justify-between items-center",
	breadcrumbLeft: "flex items-center gap-3 text-[13px]",
	backLink: "text-neutral-500 hover:text-neutral-900 transition-colors",
	divider: "h-4 w-px bg-neutral-300",
	businessName: "font-medium text-neutral-900",
	pageTitle: "font-medium text-neutral-600",

	actions: "flex items-center gap-2",
	button:
		"inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-[6px] text-[13px] font-medium transition-colors disabled:opacity-50",
	editBtn: "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
	deleteBtn: "border-neutral-200 text-rose-600 hover:bg-rose-50",
	checkoutBtn: "border-none ",
	activateBtn: "bg-emerald-600 text-white hover:bg-emerald-700 border-none ",

	content: "p-6 flex-1",
	inner: "mx-auto max-w-3xl space-y-6",

	banner:
		"bg-white rounded-lg border border-neutral-200/80 p-5  flex items-center justify-between",
	bannerTitle:
		"text-[20px] font-semibold tracking-tight text-neutral-900 flex items-center gap-3",
	statusBadge:
		"px-2 py-0.5 rounded-[4px] text-[11px] font-medium uppercase tracking-wide",
	statusActive: "bg-emerald-100 text-emerald-700",
	statusCompleted: "bg-neutral-100 text-neutral-600",
	statusDraft: "bg-amber-100 text-amber-700",

	infoGrid: "grid grid-cols-1 md:grid-cols-2 gap-6",
	infoCard: "bg-white rounded-lg border border-neutral-200/80 p-5 ",
	cardTitle:
		"text-[14px] font-medium text-neutral-900 mb-4 flex items-center gap-2",
	itemLabel:
		"text-[12px] font-medium text-neutral-500 uppercase tracking-wide mb-1",
	itemValue: "text-[14px] text-neutral-900 flex items-center gap-2",

	petSection:
		"bg-white rounded-lg border border-neutral-200/80 p-0  overflow-hidden",
	petHeader: "p-5 border-b border-neutral-200/80 bg-white/50",
	petList: "divide-y divide-neutral-200/80",
	petItem:
		"p-5 flex flex-col md:flex-row md:items-center justify-between gap-4",
	petNameRow: "flex items-center gap-2 mb-1",
	petBadge:
		"px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider",

	agreementCard: "bg-white rounded-lg border border-neutral-200/80 p-6 ",
	agreementHeader: "flex items-center justify-between mb-4",
	agreementTitle:
		"text-[14px] font-semibold text-neutral-900 flex items-center gap-2",
	agreementBox:
		"text-[12px] text-neutral-500 bg-neutral-50 p-4 rounded-lg border border-neutral-100",
	consentStamp:
		"mt-4 flex items-center gap-3 p-4 rounded-lg border border-emerald-100 bg-emerald-50/50",
	loading: "flex flex-col min-h-full p-8 items-center justify-center gap-4",
	loadingBar: "h-2 w-48 bg-neutral-100 rounded overflow-hidden",
	loadingProgress: "h-full bg-mint-green animate-progress",
} as const;
