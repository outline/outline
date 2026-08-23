import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import Features from "@/components/features-one";
import FooterSection from "@/components/footer-one";
import HeroSection from "@/components/hero-section-two";
import { MistHeader } from "@/components/mist-header";
import Pricing from "@/components/pricing-section-one";
import { APP_CONFIG } from "@/lib/constants";
import { i18n } from "@/shared/i18n/i18n.config";

// ---------------------------------------------------------------------------
// Anis AI Chat Widget — scoped to landing page only (not in dashboard)
// Replace ANIS_WIDGET_WORKSPACE_ID with the Petso workspace ID from Anis dashboard
// ---------------------------------------------------------------------------
const ANIS_WIDGET_WORKSPACE_ID = "983e991b-0797-4d1e-a541-ce9afacdb628";
const ANIS_WIDGET_SCRIPT_URL = "https://anis-widget.pages.dev/widget.js";
const ANIS_WIDGET_IFRAME_URL = "https://anis-widget.pages.dev/widget.html";
const ANIS_WIDGET_API_URL = "https://api-anis.treonstudio.com";

function AnisWidgetLoader() {
	useEffect(() => {
		if (typeof window === "undefined" || typeof document === "undefined")
			return;

		let isMounted = true;
		const SCRIPT_ID = "anis-widget-script";

		// If widget is already loaded globally, just ensure it's not destroyed
		if ((window as any).__anisWidgetLoaded) {
			return () => {
				if (typeof (window as any).__anisWidgetDestroy === "function") {
					(window as any).__anisWidgetDestroy();
				}
			};
		}

		let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement;

		if (!script) {
			script = document.createElement("script");
			script.id = SCRIPT_ID;
			script.async = true;
			script.src = ANIS_WIDGET_SCRIPT_URL;
			script.dataset.workspaceId = ANIS_WIDGET_WORKSPACE_ID;
			script.dataset.widgetUrl = ANIS_WIDGET_IFRAME_URL;
			script.dataset.apiBaseUrl = ANIS_WIDGET_API_URL;
			script.dataset.name = "Petso Assistant";
			script.dataset.color = "#22c55e";
			script.dataset.position = "bottom-right";
			script.dataset.locale = "id";
			script.dataset.mode = "hybrid";

			document.body.appendChild(script);
		}

		return () => {
			isMounted = false;
			// Clean up the widget UI and global state when leaving the landing page
			if (
				typeof window !== "undefined" &&
				typeof (window as any).__anisWidgetDestroy === "function"
			) {
				(window as any).__anisWidgetDestroy();
			}
			// We can leave the script tag in the DOM, it won't hurt, but the widget UI is destroyed.
		};
	}, []);

	return null;
}

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{
				title: i18n.t("landing_page.meta_title"),
			},
			{
				name: "description",
				content: i18n.t("landing_page.meta_description"),
			},
			{
				name: "keywords",
				content: i18n.t("landing_page.meta_keywords"),
			},
			{
				property: "og:title",
				content: i18n.t("landing_page.og_title"),
			},
			{
				property: "og:description",
				content: i18n.t("landing_page.og_description"),
			},
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: "https://peso.treonstudio.com" },
			{
				property: "og:image",
				content: "https://peso.treonstudio.com/og-image.png",
			},
			{ property: "og:site_name", content: APP_CONFIG.saasName },
			{ property: "og:locale", content: "id_ID" },
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:title",
				content: i18n.t("landing_page.twitter_title"),
			},
			{
				name: "twitter:description",
				content: i18n.t("landing_page.twitter_description"),
			},
			{
				name: "twitter:image",
				content: "https://peso.treonstudio.com/og-image.png",
			},
			{ name: "geo.region", content: "ID-JK" },
			{ name: "geo.placename", content: "Jakarta" },
			{ name: "geo.position", content: "-6.2088;106.8456" },
			{ name: "ICBM", content: "-6.2088, 106.8456" },
			{ name: "robots", content: "index, follow" },
			{ name: "canonical", content: "https://peso.treonstudio.com" },
		],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "SoftwareApplication",
					name: "Petso",
					applicationCategory: "BusinessApplication",
					operatingSystem: "Web, Windows, macOS, iOS, Android",
					offers: {
						"@type": "Offer",
						price: "299000",
						priceCurrency: "IDR",
					},
					description:
						"Software manajemen pet shop all-in-one untuk kasir, boarding, dan inventori.",
				}),
			},
		],
	}),
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="w-full min-h-screen bg-paper-white text-true-black font-inter selection:bg-mint-green/20 selection:text-ink-black">
			<AnisWidgetLoader />
			<MistHeader />
			<HeroSection />
			<Features />

			<div id="pricing">
				<Pricing />
			</div>
			<FooterSection />
		</div>
	);
}
