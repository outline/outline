import { MDXProvider } from "@mdx-js/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { mdxComponents } from "@/components/ui/mdx-components";
import { i18n } from "@/shared/i18n/i18n.config";
import TermsContent from "../content/terms.mdx";

export const Route = createFileRoute("/terms")({
	head: () => ({
		meta: [
			{ title: i18n.t("terms_page.meta_title") },
			{
				name: "description",
				content: i18n.t("terms_page.meta_description"),
			},
			{
				name: "keywords",
				content: i18n.t("terms_page.meta_keywords"),
			},
			// Open Graph
			{ property: "og:title", content: i18n.t("terms_page.og_title") },
			{
				property: "og:description",
				content: i18n.t("terms_page.og_description"),
			},
			{ property: "og:type", content: "website" },
			// GEO SEO
			{ name: "geo.region", content: "ID-JK" },
			{ name: "geo.placename", content: "Jakarta" },
			{ name: "geo.position", content: "-6.2088;106.8456" },
			{ name: "ICBM", content: "-6.2088, 106.8456" },
		],
	}),
	component: TermsPage,
});

function TermsPage() {
	const { t } = useTranslation();
	return (
		<main className="w-full bg-paper-white min-h-screen text-true-black font-inter py-20 px-6">
			<div className="max-w-[800px] mx-auto bg-white border border-mist-gray rounded-lg p-8 md:p-12 ">
				<Link
					to="/"
					className="text-mint-green font-medium text-sm hover:underline mb-8 inline-block"
				>
					&larr; {t("terms_page.back_to_home")}
				</Link>

				<div className="space-y-4 text-true-black/80 leading-relaxed">
					<MDXProvider>
						<TermsContent />
					</MDXProvider>
				</div>
			</div>
		</main>
	);
}
