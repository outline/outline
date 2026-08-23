import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/react";
import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	getSessionInfo,
	updateLanguage,
} from "@/domain/identity/auth/auth.functions";
import { SessionProvider } from "@/shared/contexts/SessionContext";
import { i18n } from "@/shared/i18n/i18n.config";
import { reportError } from "@/shared/utils";
import { EmptyState, ErrorState } from "@/ui";
import { CookieConsent } from "@/ui/status/cookie-consent";
import { OfflineBanner } from "@/ui/status/offline-banner";
import { APP_CONFIG } from "../lib/constants";
import "@/shared/i18n"; // Initialize i18n with new standards
import "../styles.css";
import { LimitModalProvider } from "@/shared/hooks/use-limit-modal";

function NotFoundComponent() {
	return (
		<div className="flex min-h-screen items-center justify-center p-6 bg-white">
			<EmptyState
				variant="search"
				title={i18n.t("error_page.not_found_title")}
				description={i18n.t("error_page.not_found_desc")}
				action={
					<Button asChild size="lg">
						<Link to="/">{i18n.t("error_page.back_home")}</Link>
					</Button>
				}
				className="bg-transparent border-none max-w-2xl"
			/>
		</div>
	);
}

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, maximum-scale=1",
			},
			{
				title: APP_CONFIG.name,
			},
		],
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
				rel: "stylesheet",
			},
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "32x32",
				href: "/favicon-32x32.png",
			},
			{
				rel: "icon",
				type: "image/png",
				sizes: "16x16",
				href: "/favicon-16x16.png",
			},
			{ rel: "manifest", href: "/site.webmanifest", color: "#000000" },
			{ rel: "icon", href: "/favicon.ico" },
		],
	}),
	errorComponent: (props) => {
		reportError(props.error);
		return (
			<RootDocument>
				<div className="flex min-h-screen items-center justify-center p-6 bg-white">
					<ErrorState
						variant="error"
						title={i18n.t("error.title")}
						description={i18n.t("error.description")}
						error={props.error}
						onRetry={() => window.location.reload()}
						className="max-w-2xl"
					/>
				</div>
			</RootDocument>
		);
	},
	notFoundComponent: () => <NotFoundComponent />,
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: ReactNode }) {
	const { queryClient } = Route.useRouteContext();

	// ---------------------------------------------------------------------------
	// Anis Promotions embed — loaded on every page (public + dashboard)
	// Replace PROMOTIONS_SCRIPT_URL with the deployed promotions.js URL
	// ---------------------------------------------------------------------------
	const ANIS_PROMOTIONS_WORKSPACE_ID = "983e991b-0797-4d1e-a541-ce9afacdb628";
	const ANIS_PROMOTIONS_SCRIPT_URL =
		"https://anis-widget.pages.dev/promotions.js";

	useEffect(() => {
		if (typeof window === "undefined" || typeof document === "undefined")
			return;

		const SCRIPT_ID = "anis-promotions-script";

		// Guard against double-load
		if ((window as any).__anisPromotionsLoaded) return;

		let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
if (!script) {
				script = document.createElement("script");
				script.id = SCRIPT_ID;
				script.async = true;
				script.src = ANIS_PROMOTIONS_SCRIPT_URL;
				script.dataset.workspaceId = ANIS_PROMOTIONS_WORKSPACE_ID;
				script.dataset.siteKey = "sk_petso_production";
				script.dataset.locale = "id";
				script.dataset.apiBaseUrl = "https://api-anis.treonstudio.com";
				document.body.appendChild(script);
			}

		return () => {
			if (typeof (window as any).__anisPromotionsDestroy === "function") {
				(window as any).__anisPromotionsDestroy();
			}
		};
	}, []);

	return (
		<html lang={i18n.language}>
			<head>
				<HeadContent />
			</head>
			<body>
				<I18nextProvider i18n={i18n}>
					<NuqsAdapter>
						<QueryClientProvider client={queryClient}>
							<SessionProvider
								getSessionInfo={getSessionInfo}
								updateLanguage={(lang) => updateLanguage({ data: lang })}
							>
								<LimitModalProvider>
									{children}
									<OfflineBanner />
									<Toaster position="top-center" />
									<CookieConsent />
								</LimitModalProvider>
							</SessionProvider>
						</QueryClientProvider>
					</NuqsAdapter>
				</I18nextProvider>
				<Scripts />
			</body>
		</html>
	);
}
