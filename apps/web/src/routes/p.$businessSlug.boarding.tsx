import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { BoardingForm } from "@/domain/boarding/components/BoardingForm/BoardingForm";
import { getPublicBusinessBySlug } from "@/lib/api/public.functions";
import { APP_CONFIG } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { EmptyState, SuccessState } from "@/ui";

export const Route = createFileRoute("/p/$businessSlug/boarding")({
	head: ({ params }) => ({
		meta: [
			{ title: `${i18n.t("public.boarding.title")} — ${params.businessSlug}` },
			{
				name: "description",
				content: i18n.t("public.boarding.meta_description"),
			},
		],
	}),
	component: PublicBoardingPage,
});

function PublicBoardingPage() {
	const { businessSlug } = Route.useParams();
	const { t } = useTranslation();

	const {
		data: business,
		isLoading: bizLoading,
		error: bizError,
	} = useQuery({
		queryKey: queryKeys.publicBoarding.detail(businessSlug),
		queryFn: () => getPublicBusinessBySlug({ data: businessSlug }),
	});

	const [isSubmitted, setIsSubmitted] = React.useState(false);

	if (bizLoading)
		return (
			<div className="min-h-screen bg-neutral-50/50 pb-20">
				<header className="bg-white border-b border-neutral-200 h-16 flex items-center px-6 sticky top-0 z-50">
					<div className="max-w-4xl mx-auto w-full flex items-center gap-4">
						<Skeleton className="h-10 w-10 rounded-md" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-32 rounded-lg" />
							<Skeleton className="h-3 w-24 rounded-lg" />
						</div>
					</div>
				</header>
				<div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
					<Skeleton className="h-6 w-56 rounded-lg" />
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-12 w-full rounded-xl" />
					))}
				</div>
			</div>
		);

	if (bizError || !business || "error" in business) {
		return (
			<div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50">
				<EmptyState
					title={t("public.boarding.biz_not_found")}
					description={t("public.boarding.biz_not_found_desc")}
				/>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50/50 pb-20">
			{/* Public Header */}
			<header className="bg-white border-b border-neutral-200 h-16 flex items-center px-6 sticky top-0 z-50">
				<div className="max-w-4xl mx-auto w-full flex items-center gap-4">
					{business.logoUrl ? (
						<img
							src={business.logoUrl}
							alt={business.name}
							className="h-10 w-10 object-contain rounded-md"
						/>
					) : (
						<div className="h-10 w-10 bg-neutral-900 rounded-md flex items-center justify-center text-white font-bold">
							{business.name.charAt(0)}
						</div>
					)}
					<div>
						<h1 className="font-bold text-neutral-900 leading-tight">
							{business.name}
						</h1>
						<p className="text-[12px] text-neutral-500">
							{t("public.boarding.title")}
						</p>
					</div>
				</div>
			</header>

			<main className="max-w-4xl mx-auto p-4 sm:p-6 mt-4">
				{isSubmitted ? (
					<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
						<SuccessState
							title={t("public.boarding.success_title")}
							description={t("public.boarding.success_desc")}
						/>
					</div>
				) : (
					<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
						<BoardingForm
							hideHeader
							publicBusinessId={business.id}
							onSuccess={() => setIsSubmitted(true)}
						/>
					</div>
				)}
			</main>

			<footer className="max-w-4xl mx-auto px-6 py-8 text-center">
				<p className="text-[12px] text-neutral-400">
					{t("public.boarding.footer_powered_by")}{" "}
					<span className="font-bold text-neutral-600">{APP_CONFIG.name}</span>{" "}
					— {t("login_page.hero_subtext")}
				</p>
			</footer>
		</div>
	);
}
