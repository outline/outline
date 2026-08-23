import { useTranslation } from "react-i18next";
import { CrownStarBoldDuotone as StarIcon } from "solar-icon-set";
import { formatCurrency } from "@/shared/utils/format";
import { DashboardCard } from "@/ui";

export type TTopSeller = {
	id: string;
	name: string;
	category: string;
	salesCount: number;
	revenue: number;
};

export function TopSellers({
	topSellers,
	className,
}: {
	topSellers: readonly TTopSeller[];
	className?: string;
}) {
	const { t } = useTranslation();

	return (
		<DashboardCard title="Top Sellers" icon={StarIcon} className={className}>
			<div className="flex flex-col gap-4 mt-2">
				{topSellers.map((item, idx) => (
					<div
						key={item.id}
						className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
					>
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs shrink-0">
								#{idx + 1}
							</div>
							<div>
								<p className="text-[13px] font-bold text-neutral-900 leading-none mb-1">
									{item.name}
								</p>
								<p className="text-[11px] text-neutral-500">
									{item.category} • {item.salesCount}{" "}
									{t("dashboard.sales", "terjual")}
								</p>
							</div>
						</div>
						<div className="text-right">
							<span className="font-medium text-emerald-600">
								{formatCurrency(item.revenue)}
							</span>
						</div>
					</div>
				))}
			</div>
		</DashboardCard>
	);
}
