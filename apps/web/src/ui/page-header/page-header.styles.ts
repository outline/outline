export const styles = {
	wrapper:
		"flex flex-col border-b border-neutral-200/80 bg-white flex-shrink-0",
	topNav:
		"px-6 py-3 flex items-center justify-between border-b border-neutral-100",
	breadcrumbList: "flex items-center gap-2 text-[13px]",
	backButton:
		"p-1 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors mr-1",
	separator: "text-neutral-300 mx-0.5",
	breadcrumbLink:
		"font-medium text-neutral-500 hover:text-neutral-900 transition-colors",
	breadcrumbActive: "font-medium text-neutral-900",
	titleArea:
		"px-6 py-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4",
	title:
		"text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2.5",
	icon: "w-6 h-6 text-mint-green",
	description: "text-[14px] text-neutral-500 max-w-2xl",
	actionsDesktop: "hidden md:flex items-center gap-3",
	actionsMobile: "flex md:hidden items-center gap-3",
} as const;
