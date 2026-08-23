import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { StarLinear as StarIcon } from "solar-icon-set";
import { portalApi } from "@/lib/api/portal.functions";
import { useLanguage } from "@/shared/i18n";
import { cn, formatDate } from "@/shared/utils";
import { EmptyState } from "@/ui";

export function ReviewsTab() {
	const { t } = useTranslation();
	const { language } = useLanguage();
	const { data: reviews = [] } = useQuery({
		queryKey: ["portalReviews"],
		queryFn: () => portalApi.getPortalReviews(),
	});

	return (
		<div className="space-y-4">
			<h3 className="text-lg font-bold text-neutral-900">
				{t("portal.customer_reviews")}
			</h3>

			{reviews.length === 0 ? (
				<EmptyState
					variant="portal-reviews"
					title={t("portal.no_reviews")}
					description={t("portal.no_reviews_desc")}
					className="bg-white border-dashed border-neutral-200"
				/>
			) : (
				<div className="space-y-3">
					{reviews.map((review) => {
						const r = review as Record<string, unknown>;
						return (
							<div
								key={r.id as string}
								className="bg-white rounded-lg border border-neutral-200 p-4"
							>
								<div className="flex justify-between items-start mb-2">
									<div>
										<div className="font-medium text-neutral-900">
											{r.customer_name as string}
										</div>
										<div className="flex gap-0.5 mt-1">
											{[1, 2, 3, 4, 5].map((star) => (
												<StarIcon
													key={star}
													className={cn(
														"w-4 h-4",
														star <= (r.rating as number)
															? "text-amber-400"
															: "text-neutral-200",
													)}
												/>
											))}
										</div>
									</div>
									<div className="text-xs text-neutral-500">
										{formatDate(r.created_at as string, language)}
									</div>
								</div>
								{Boolean(r.comment) && (
									<p className="text-sm text-neutral-600 mt-2">
										{String(r.comment)}
									</p>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
