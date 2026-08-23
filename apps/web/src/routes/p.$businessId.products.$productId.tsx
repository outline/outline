import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BoxLinear as ProductIcon } from "solar-icon-set";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicProduct } from "@/lib/api/public.functions";
import { APP_CONFIG } from "@/lib/constants";
import { queryKeys } from "@/shared/cache/query-keys";
import { formatCurrency } from "@/shared/utils/format";
import { Button, Card, CardContent, EmptyState } from "@/ui";
import { SafeHtml } from "@/shared/components/SafeHtml";

export const Route = createFileRoute("/p/$businessId/products/$productId")({
	head: () => ({
		meta: [
			{ title: `Informasi Produk — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: "Detail informasi produk toko.",
			},
		],
	}),
	component: PublicProductPage,
});

function PublicProductPage() {
	const { businessId, productId } = Route.useParams();
	const { t } = useTranslation();

	const {
		data: product,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.publicPortal.product(businessId, productId),
		queryFn: () => getPublicProduct({ data: { businessId, productId } }),
	});

	if (isLoading) {
		return (
			<div className="min-h-screen bg-neutral-50/50 pb-20">
				<header className="bg-white border-b border-neutral-200 h-16 flex items-center px-6 sticky top-0 z-50">
					<div className="max-w-2xl mx-auto w-full flex items-center gap-3">
						<Skeleton className="h-8 w-8 rounded-md" />
						<Skeleton className="h-4 w-32" />
					</div>
				</header>
				<main className="max-w-2xl mx-auto p-4 sm:p-6 mt-4 space-y-6">
					<Card className="overflow-hidden border-none shadow-sm ring-1 ring-neutral-200">
						<Skeleton className="aspect-square w-full rounded-none" />
						<CardContent className="p-6 space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-8 w-64" />
								<Skeleton className="h-4 w-24" />
							</div>
							<Skeleton className="h-10 w-32" />
							<div className="pt-4 border-t border-neutral-100 space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-24 w-full" />
							</div>
						</CardContent>
					</Card>
				</main>
			</div>
		);
	}

	if (error || !product) {
		return (
			<div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50">
				<EmptyState
					title={t("public.product.not_found")}
					description={t("public.product.not_found_desc")}
				/>
			</div>
		);
	}

	const businessName =
		String(
			(
				(product as Record<string, unknown>).businesses as Record<
					string,
					unknown
				>
			)?.name,
		) || "Toko Kami";
	const businessLogo = (
		(product as Record<string, unknown>).businesses as Record<string, unknown>
	)?.logo_url;

	return (
		<div className="min-h-screen bg-neutral-50/50 pb-20">
			{/* Public Header */}
			<header className="bg-white border-b border-neutral-200 h-16 flex items-center px-6 sticky top-0 z-50">
				<div className="max-w-2xl mx-auto w-full flex items-center gap-3">
					{businessLogo ? (
						<img
							src={businessLogo as string}
							alt={businessName as string}
							className="h-8 w-8 object-contain rounded-md"
						/>
					) : (
						<div className="h-8 w-8 bg-neutral-900 rounded-md flex items-center justify-center text-white font-bold text-[12px]">
							{(businessName as string).charAt(0)}
						</div>
					)}
					<h1 className="font-bold text-neutral-900 text-sm">
						{businessName as string}
					</h1>
				</div>
			</header>

			<main className="max-w-2xl mx-auto p-4 sm:p-6 mt-4 space-y-6">
				<Card className="overflow-hidden border-none shadow-sm ring-1 ring-neutral-200">
					<div className="aspect-square w-full bg-neutral-100 flex items-center justify-center text-neutral-300">
						<ProductIcon className="w-20 h-20" />
					</div>
					<CardContent className="p-6 space-y-4">
						<div>
							<h2 className="text-2xl font-bold text-neutral-900">
								{product.name}
							</h2>
							<p className="text-neutral-500 text-sm mt-1">
								{product.sku || t("public.product.no_sku")}
							</p>
						</div>

						<div className="text-3xl font-black text-ink-black">
							{formatCurrency(product.price, "id")}
						</div>

						<div className="pt-4 border-t border-neutral-100 space-y-2">
							<h3 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">
								{t("public.product.description")}
							</h3>
							{(product as Record<string, unknown>).description ? (
								<SafeHtml
									html={
										(product as Record<string, unknown>).description as string
									}
									className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap [&>p]:m-0 [&>p]:leading-normal"
								/>
							) : (
								<div className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">
									{t("public.product.no_description")}
								</div>
							)}
						</div>

						<div className="pt-4 flex items-center gap-4">
							<div className="flex-1 space-y-1">
								<h3 className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">
									{t("public.product.stock_status")}
								</h3>
								<div className="flex items-center gap-2">
									<div
										className={`h-2 w-2 rounded-full ${product.stock > 0 ? "bg-emerald-500" : "bg-rose-500"}`}
									/>
									<span className="text-sm font-medium text-neutral-700">
										{product.stock > 0
											? `${t("public.product.available")} (${product.stock})`
											: t("public.product.out_of_stock")}
									</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="flex flex-col gap-3">
					<Button className="w-full h-12 rounded-xl text-[15px] font-bold shadow-sm shadow-neutral-200">
						{t("public.product.contact_whatsapp")}
					</Button>
					<Button
						variant="outline"
						className="w-full h-12 rounded-xl text-[15px] font-bold"
					>
						{t("public.product.open_location")}
					</Button>
				</div>
			</main>

			<footer className="max-w-2xl mx-auto px-6 py-8 text-center">
				<p className="text-[11px] text-neutral-400">
					{t("public.product.official_info")}{" "}
					<span className="font-bold text-neutral-600">{businessName}</span>
				</p>
			</footer>
		</div>
	);
}
