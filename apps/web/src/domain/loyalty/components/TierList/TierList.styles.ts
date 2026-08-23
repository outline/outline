export const styles = {
	grid: "grid grid-cols-1 md:grid-cols-3 gap-6",
	card: "p-6 rounded-lg border border-neutral-200 bg-white relative overflow-hidden transition-all hover: group",
	header: "flex flex-col gap-1 mb-4",
	tierName: "text-[16px] font-bold text-neutral-900",
	minPoints: "text-[12px] text-neutral-500 font-medium",
	discountBadge:
		"absolute top-4 right-4 bg-mint-green text-white text-[12px] font-bold px-3 py-1 rounded-full",
	benefits: "space-y-2 mt-4 pt-4 border-t border-neutral-50",
	benefitItem: "flex items-center gap-2 text-[13px] text-neutral-600",
	benefitIcon: "w-4 h-4 text-mint-green",
} as const;
