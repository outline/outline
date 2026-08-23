import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	LetterLinear as Mail,
	MapPointLinear as MapPin,
	PhoneLinear as Phone,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { FormBuilder } from "@/lib/form-builder";
import { ContactDocType } from "@/lib/form-builder/examples/contact.doctype";

import { i18n } from "@/shared/i18n/i18n.config";

export const Route = createFileRoute("/contact")({
	head: () => ({
		meta: [
			{ title: i18n.t("contact_page.meta_title") },
			{
				name: "description",
				content: i18n.t("contact_page.meta_description"),
			},
			{
				name: "keywords",
				content: i18n.t("contact_page.meta_keywords"),
			},
			// Open Graph
			{ property: "og:title", content: i18n.t("contact_page.og_title") },
			{
				property: "og:description",
				content: i18n.t("contact_page.og_description"),
			},
			{ property: "og:type", content: "website" },
			// GEO SEO
			{ name: "geo.region", content: "ID-JK" },
			{ name: "geo.placename", content: "Jakarta" },
			{ name: "geo.position", content: "-6.2088;106.8456" },
			{ name: "ICBM", content: "-6.2088, 106.8456" },
		],
	}),
	component: ContactPage,
});

function ContactPage() {
	const { t } = useTranslation();
	const handleSubmit = async (_values: Record<string, unknown>) => {
		// Simulate network request
		await new Promise((resolve) => setTimeout(resolve, 1000));
		toast.success(t("contact_page.toast_message_success"), {
			description: t("contact_page.toast_message_desc"),
		});
		return { message: t("contact_page.success_message") };
	};

	return (
		<main className="w-full bg-paper-white min-h-screen text-true-black font-inter py-20 px-6">
			<div className="max-w-[1000px] mx-auto bg-white border border-mist-gray rounded-lg  overflow-hidden flex flex-col md:flex-row">
				{/* Left Side: Contact Info */}
				<div className="w-full md:w-[40%] bg-mint-green p-10 md:p-12 text-paper-white relative overflow-hidden">
					<div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-bl-full -mr-20 -mt-20" />
					<Link
						to="/"
						className="text-paper-white/80 font-medium text-sm hover:text-white mb-12 inline-block relative z-10"
					>
						&larr; {t("contact_page.back_to_home")}
					</Link>

					<h1 className="text-4xl font-semibold mb-4 tracking-tight relative z-10 text-white">
						{t("contact_page.title")}
					</h1>
					<p className="text-paper-white/90 mb-12 relative z-10 leading-relaxed">
						{t("contact_page.subtitle")}
					</p>

					<div className="space-y-8 relative z-10">
						<div className="flex items-start gap-4">
							<div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
								<Mail className="w-5 h-5 text-white" />
							</div>
							<div>
								<div className="text-sm text-paper-white/80 font-medium mb-1">
									{t("contact_page.email_us")}
								</div>
								<div className="font-semibold text-white">
									support@petstoresaas.com
								</div>
							</div>
						</div>
						<div className="flex items-start gap-4">
							<div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
								<Phone className="w-5 h-5 text-white" />
							</div>
							<div>
								<div className="text-sm text-paper-white/80 font-medium mb-1">
									{t("contact_page.call_us")}
								</div>
								<div className="font-semibold text-white">
									+62 811 2233 4455
								</div>
							</div>
						</div>
						<div className="flex items-start gap-4">
							<div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
								<MapPin className="w-5 h-5 text-white" />
							</div>
							<div>
								<div className="text-sm text-paper-white/80 font-medium mb-1">
									{t("contact_page.visit_us")}
								</div>
								<div className="font-semibold text-white leading-relaxed whitespace-pre-line">
									{t("contact_page.address_details")}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Right Side: Contact Form */}
				<div className="w-full md:w-[60%] p-10 md:p-12">
					<h2 className="text-2xl font-semibold text-ink-black mb-2">
						{t("contact_page.form_heading")}
					</h2>
					<p className="text-true-black/60 mb-8">
						{t("contact_page.form_subheading")}
					</p>

					<FormBuilder
						doctype={ContactDocType}
						mode="create"
						onSubmit={handleSubmit}
					/>
				</div>
			</div>
		</main>
	);
}
