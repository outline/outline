export const styles = {
	container: "flex flex-col min-h-full",
	breadcrumb:
		"border-b border-neutral-200/80 px-5 py-3 bg-white flex-shrink-0 flex items-center justify-between",
	breadcrumbText: "flex items-center gap-2 text-[13px]",
	businessName: "font-medium text-neutral-900",
	pageTitle: "font-medium text-neutral-600",
	content: "p-6 flex-1",
	formWrapper: "mx-auto max-w-3xl",

	card: "bg-white rounded-lg border border-mist-gray",
	cardHeader:
		"flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 border-b border-mist-gray",
	cardTitle: "text-[24px] font-semibold text-ink-black tracking-[-0.24px]",
	cardSubtitle: "text-[14px] text-true-black/60 mt-1",
	draftButton:
		"mt-4 sm:mt-0 text-[13px] font-medium text-true-black/60 hover:text-ink-black transition-colors",
	cardBody: "p-0 sm:p-4",

	accordionTrigger:
		"px-6 py-4 hover:bg-[#fafafa] transition-colors data-[state=open]:bg-[#fafafa]",
	accordionTriggerContent: "flex items-center gap-4 text-left w-full",
	accordionNumber:
		"flex h-8 w-8 items-center justify-center rounded-[4px] border border-mist-gray text-[13px] font-bold text-true-black/40 bg-white",
	accordionNumberActive: "border-mint-green bg-mint-green text-paper-white",
	accordionTitleContainer: "flex flex-col",
	accordionTitle: "text-[15px] font-semibold text-ink-black",
	accordionDescription: "text-[13px] text-true-black/60 font-normal",
	accordionContent: "p-6 sm:p-8 bg-white",

	fieldGrid: "grid gap-6",
	field: "grid gap-2",
	label: "text-[14px] font-medium text-ink-black",
	labelSecondary: "text-[12px] font-medium text-true-black/60",
	input:
		"rounded-[4px] border border-cloud-gray h-10 text-[14px] px-3 outline-none focus:ring-2 focus:ring-mint-green/10 focus:border-mint-green transition-all",
	textarea:
		"min-h-[100px] rounded-[4px] border border-cloud-gray text-[14px] p-3 outline-none focus:ring-2 focus:ring-mint-green/10 focus:border-mint-green transition-all resize-none",
	errorText: "text-[12px] text-red-500",

	footer:
		"border-t border-mist-gray bg-[#fafafa] px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-[16px]",
	footerButton: "w-full sm:w-auto justify-center",
	footerButtonPrimary: "",

	petCard:
		"relative space-y-6 rounded-[8px] border border-mist-gray p-6 bg-[#fafafa]",
	petLabel:
		"text-[13px] font-medium text-mint-green uppercase tracking-[0.65px]",
	removePet:
		"absolute top-4 right-4 text-true-black/40 hover:text-red-500 transition-colors",
	addPetButton:
		"w-full h-12 flex items-center justify-center gap-2 rounded-[4px] border border-dashed border-cloud-gray text-[14px] font-medium text-ink-black hover:bg-[#fafafa] transition-colors",

	agreementBox:
		"max-h-[400px] space-y-6 overflow-y-auto rounded-[8px] border border-mist-gray p-6 bg-[#fafafa]",
	agreementTitle: "text-[18px] font-semibold text-ink-black text-center mb-6",
	clauseTitle: "text-[15px] font-semibold text-ink-black",
	clauseContent: "text-[14px] text-true-black/70 leading-[1.5]",
	agreementConsent:
		"flex items-start space-x-4 rounded-[8px] border border-mist-gray bg-[#fafafa] p-6",

	successHeader: "bg-[#fafafa] py-12 text-center border-b border-mist-gray",
	successIcon:
		"mx-auto flex h-16 w-16 items-center justify-center rounded-[4px] bg-mint-green text-paper-white mb-6",
	successTitle: "text-[32px] font-semibold text-ink-black tracking-[-0.02em]",
	successBody: "p-8 space-y-8",
	summaryItem: "space-y-1",
	summaryLabel:
		"flex items-center gap-2 text-mint-green font-medium text-[13px] uppercase tracking-[0.65px]",
	summaryValue: "font-semibold text-ink-black text-[18px] mt-2",
	summaryDetail: "text-[14px] text-true-black/70",
} as const;
