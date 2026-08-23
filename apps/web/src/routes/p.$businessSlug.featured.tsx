import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GalleryLinear as GalleryIcon } from "solar-icon-set";
import {
	getPublicBusinessBySlug,
	getPublicFeaturedProducts,
} from "@/lib/api/public.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { EmptyState } from "@/ui";

function ProductImage({ src, alt }: { src: string; alt: string }) {
	const [failed, setFailed] = useState(false);

	if (failed) {
		return <ProductImagePlaceholder />;
	}

	return (
		<img
			src={src}
			alt={alt}
			loading="lazy"
			className="w-full h-48 object-cover"
			onError={() => setFailed(true)}
		/>
	);
}

function ProductImagePlaceholder() {
	const { t } = useTranslation();
	return (
		<div className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center gap-2 text-gray-400">
			<GalleryIcon className="w-10 h-10" />
			<span className="text-xs">{t("public.featured.no_image")}</span>
		</div>
	);
}

export const Route = createFileRoute("/p/$businessSlug/featured")({
	head: ({ params }) => ({
		meta: [
			{ title: `${i18n.t("public.featured.title")} — ${params.businessSlug}` },
		],
	}),
	component: PublicFeaturedPage,
});

function PublicFeaturedPage() {
	const { businessSlug } = Route.useParams();
	const { t } = useTranslation();

	const { data: business, isLoading: bizLoading } = useQuery({
		queryKey: queryKeys.publicBoarding.detail(businessSlug),
		queryFn: () => getPublicBusinessBySlug({ data: businessSlug }),
	});

	const { data: products, isLoading: prodLoading } = useQuery({
		queryKey: [
			...queryKeys.publicPortal.all(businessSlug),
			"featured",
		] as const,
		queryFn: () => getPublicFeaturedProducts({ data: businessSlug }),
		enabled: !!businessSlug,
	});

	if (bizLoading || prodLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-[#c6f5d6] to-[#defbe9]">
				<div className="max-w-6xl mx-auto px-4 py-8">
					<div className="mb-8 space-y-2">
						<Skeleton className="h-8 w-56 rounded-lg" />
						<Skeleton className="h-4 w-72 rounded-lg" />
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<div
								key={i}
								className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
							>
								<Skeleton className="w-full h-48 rounded-none" />
								<div className="p-4 space-y-3">
									<Skeleton className="h-4 w-20 rounded-full" />
									<Skeleton className="h-5 w-3/4 rounded-lg" />
									<Skeleton className="h-4 w-full rounded-lg" />
									<Skeleton className="h-6 w-24 rounded-lg" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (!business) {
		return (
			<EmptyState
				title={t("public.not_found")}
				description={t("public.business_not_found")}
			/>
		);
	}

	if (!products || products.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen p-6">
				<EmptyState
					title={t("public.featured.empty_title")}
					description={t("public.featured.empty_message")}
				/>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-[#c6f5d6] to-[#defbe9]">
			<div className="max-w-6xl mx-auto px-4 py-8">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							{t("public.featured.title")}
						</h1>
						<p className="text-gray-600 mt-1">
							{business.name} — {t("public.featured.subtitle")}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{products.map((product) => (
						<div
							key={product.id}
							className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
						>
							{product.imageUrl ? (
								<ProductImage src={product.imageUrl} alt={product.name} />
							) : (
								<ProductImagePlaceholder />
							)}
							<div className="p-4">
								{product.category && (
									<span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
										{product.category}
									</span>
								)}
								<h3 className="text-lg font-semibold text-gray-900 mt-2">
									{product.name}
								</h3>
								{product.description && (
									<p className="text-sm text-gray-500 mt-1 line-clamp-2">
										{product.description}
									</p>
								)}
								<div className="mt-4 flex items-center justify-between">
									<span className="text-xl font-bold text-gray-900">
										Rp{product.price.toLocaleString("id-ID")}
									</span>
									{product.stock > 0 ? (
										<span className="text-xs text-green-600">
											{t("public.featured.in_stock")}
										</span>
									) : (
										<span className="text-xs text-red-500">
											{t("public.featured.out_of_stock")}
										</span>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
