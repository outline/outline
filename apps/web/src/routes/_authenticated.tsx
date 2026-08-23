import {
	createFileRoute,
	Outlet,
	redirect,
	useRouterState,
} from "@tanstack/react-router";
import * as React from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
	BillListLinear as BillIcon,
	BillListBold as BillIconBold,
	Card2Linear as BillingIcon,
	Card2Bold as BillingIconBold,
	ChartLinear as ChartIcon,
	ChartBold as ChartIconBold,
	GlobalLinear as Domains,
	GlobalBold as DomainsBold,
	ExportLinear as ExportIcon,
	ExportBold as ExportIconBold,
	DocumentTextLinear as FileText,
	DocumentTextBold as FileTextBold,
	PieChartLinear as LayoutDashboard,
	PieChartBold as LayoutDashboardBold,
	LockKeyholeLinear as LockIcon,
	LockKeyholeBold as LockIconBold,
	WidgetLinear as Projects,
	WidgetBold as ProjectsBold,
	DocumentTextLinear as Receipt,
	DocumentTextBold as ReceiptBold,
	BedLinear as RoomIcon,
	BedBold as RoomIconBold,
	SettingsLinear as SettingsIcon,
	SettingsBold as SettingsIconBold,
	StarLinear as StarIcon,
	StarBold as StarIconBold,
	DatabaseLinear as Storage,
	DatabaseBold as StorageBold,
	UserRoundedLinear as UserIcon,
	UserRoundedBold as UserIconBold,
	UsersGroupRoundedLinear as Users,
	UsersGroupRoundedBold as UsersBold,
	WalletLinear as WalletIcon,
	WalletBold as WalletIconBold,
	Smartphone2Linear as WhatsAppIcon,
	Smartphone2Bold as WhatsAppIconBold,
} from "solar-icon-set";
import { AuthHeader } from "@/components/layout/AuthHeader";
import { AuthSidebar } from "@/components/layout/AuthSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PinLockScreen } from "@/components/security/PinLockScreen";
import { Skeleton } from "@/components/ui/skeleton";
import { checkAuth } from "@/domain/identity/auth/auth.functions";
import {
	useIdleTimeout,
	useKeyboardShortcuts,
	useSession,
} from "@/shared/hooks";
import { cn } from "@/shared/utils";
import { RouteErrorBoundary } from "@/ui";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async () => {
		const isAuthenticated = await checkAuth();
		if (!isAuthenticated) throw redirect({ to: "/login" });
	},
	component: AuthLayout,
	errorComponent: ({ error, reset }) => (
		<RouteErrorBoundary error={error as Error} reset={reset} />
	),
});

function AuthLayout() {
	const { session, isLoading, error: sessionError } = useSession();
	const path = useRouterState({ select: (s) => s.location.pathname });
	const { t } = useTranslation();
	const [showPromo, setShowPromo] = React.useState(true);
	const { isIdle, hasPinSet, unlock } = useIdleTimeout();

	useKeyboardShortcuts();

	const isMac = React.useMemo(
		() =>
			typeof navigator !== "undefined" &&
			/Mac|iPod|iPhone|iPad/.test(navigator.platform),
		[],
	);
	const modKey = isMac ? "⌘" : "Ctrl";

	const topNavItems = useMemo(
		() => [
			{
				to: "/dashboard",
				label: t("nav.dashboard"),
				icon: LayoutDashboard,
			},
			{
				to: "/pos",
				label: t("nav.operations", "Operasional"),
				icon: Projects,
				roles: ["owner", "manager", "admin", "kasir", "staff_daycare"],
				activePaths: [
					"/pos",
					"/orders",
					"/products",
					"/boardings",
					"/occupancy",
					"/customers",
				],
			},
			{
				to: "/accounting",
				label: t("nav.parent_finance"),
				icon: ChartIcon,
				roles: ["owner", "manager", "admin"],
			},
			{
				to: "/branches",
				label: t("nav.parent_management"),
				icon: Domains,
				roles: ["owner", "manager", "admin"],
			},
		],
		[t],
	);

	const sidebarItems = useMemo(() => {
		const role = session?.role || "staff_daycare";
		const isManagement =
			role === "owner" || role === "manager" || role === "admin";

		// Option A applied: Gabungkan Pengaturan Toko (Bisnis, Tagihan, Staf, Cabang, Dokumen)

		if (
			(path.startsWith("/pos") ||
				path.startsWith("/orders") ||
				path.startsWith("/products") ||
				path.startsWith("/boardings") ||
				path.startsWith("/occupancy") ||
				path.startsWith("/customers")) &&
			(isManagement || role === "kasir" || role === "staff_daycare")
		) {
			return [
				...(isManagement || role === "kasir"
					? [
							{
								to: "/pos",
								label: t("nav.pos"),
								icon: Projects,
								iconActive: ProjectsBold,
							},
						]
					: []),
				...(isManagement || role === "staff_daycare"
					? [
							{
								to: "/boardings",
								label: t("nav.boardings"),
								icon: FileText,
								iconActive: FileTextBold,
							},
							{
								to: "/occupancy",
								label: t("nav.occupancy"),
								icon: RoomIcon,
								iconActive: RoomIconBold,
							},
						]
					: []),
				...(isManagement
					? [
							{
								to: "/products",
								label: t("nav.products"),
								icon: Storage,
								iconActive: StorageBold,
							},
						]
					: []),
				{
					to: "/customers",
					label: t("nav.customers"),
					icon: UserIcon,
					iconActive: UserIconBold,
				},
				...(isManagement || role === "kasir"
					? [
							{
								to: "/orders",
								label: t("nav.orders"),
								icon: Receipt,
								iconActive: ReceiptBold,
							},
						]
					: []),
			];
		}

		if (
			(path.startsWith("/settings") ||
				path.startsWith("/branches") ||
				path.startsWith("/staff") ||
				path.startsWith("/customers")) &&
			isManagement
		) {
			return [
				{
					to: "/settings",
					label: t("nav.business_info"),
					icon: Domains,
					iconActive: DomainsBold,
				},
				{
					to: "/branches",
					label: t("nav.branches"),
					icon: Storage,
					iconActive: StorageBold,
				},
				{
					to: "/staff",
					label: t("nav.staff"),
					icon: Users,
					iconActive: UsersBold,
				},
				{
					to: "/customers",
					label: t("nav.customers"),
					icon: UserIcon,
					iconActive: UserIconBold,
				},
				{
					to: "/portal",
					label: t("nav.portal"),
					icon: WhatsAppIcon,
					iconActive: WhatsAppIconBold,
				},
				{
					to: "/settings/billing",
					label: t("settings.billing_info"),
					icon: BillingIcon,
					iconActive: BillingIconBold,
				},
				{
					to: "/settings/documents",
					label: t("nav.boarding_letter"),
					icon: FileText,
					iconActive: FileTextBold,
				},
				{
					to: "/settings/receipts",
					label: t("boarding_settings.tabs.receipt"),
					icon: BillIcon,
					iconActive: BillIconBold,
				},
			];
		}

		if (
			(path.startsWith("/loyalty") ||
				path.startsWith("/whatsapp") ||
				path.startsWith("/portal") ||
				path.startsWith("/customers")) &&
			isManagement
		) {
			return [
				{
					to: "/customers",
					label: t("nav.customers"),
					icon: Users,
					iconActive: UsersBold,
				},
				{
					to: "/loyalty",
					label: t("nav.loyalty"),
					icon: StarIcon,
					iconActive: StarIconBold,
				},
				{
					to: "/whatsapp",
					label: t("nav.whatsapp"),
					icon: WhatsAppIcon,
					iconActive: WhatsAppIconBold,
				},
				{
					to: "/portal",
					label: t("nav.portal"),
					icon: Domains,
					iconActive: DomainsBold,
				},
			];
		}

		if (
			(path.startsWith("/accounting") || path.startsWith("/invoices")) &&
			isManagement
		) {
			return [
				{
					to: "/accounting",
					label: t("common.overview"),
					icon: ChartIcon,
					iconActive: ChartIconBold,
				},
				{
					to: "/accounting/expenses",
					label: t("accounting.expenses_tab"),
					icon: WalletIcon,
					iconActive: WalletIconBold,
				},
				{
					to: "/invoices",
					label: t("nav.invoices"),
					icon: BillIcon,
					iconActive: BillIconBold,
				},
				{
					to: "/accounting/pettycash",
					label: t("accounting.pettycash_tab"),
					icon: BillIcon,
					iconActive: BillIconBold,
				},
				{
					to: "/accounting/journal",
					label: t("accounting.journal_tab"),
					icon: FileText,
					iconActive: FileTextBold,
				},
				{
					to: "/accounting/reports",
					label: t("accounting.reports_tab"),
					icon: ExportIcon,
					iconActive: ExportIconBold,
				},
			];
		}

		if (path.startsWith("/profile")) {
			return [
				{
					to: "/profile",
					label: t("settings.personal_info"),
					icon: UserIcon,
					iconActive: UserIconBold,
				},
				{
					to: "/profile/security",
					label: t("settings.security"),
					icon: LockIcon,
					iconActive: LockIconBold,
				},
				{
					to: "/profile/preferences",
					label: t("settings.preferences"),
					icon: SettingsIcon,
					iconActive: SettingsIconBold,
				},
			];
		}

		return [
			{
				to: "/dashboard",
				label: t("nav.dashboard"),
				icon: LayoutDashboard,
				iconActive: LayoutDashboardBold,
			},
		];
	}, [session, path, t]);

	return (
		<div className="h-[100dvh] overflow-hidden w-full bg-gradient-to-b from-[#c6f5d6] to-[#defbe9] text-true-black font-inter flex flex-col">
			<AuthHeader
				session={session}
				topNavItems={topNavItems}
				currentPath={path}
				modKey={modKey}
			/>

			<div className="flex flex-1 min-h-0 mx-2 md:mx-4 mb-2 md:mb-4 bg-white rounded-t-[12px] md:rounded-lg border border-t-0 border-neutral-200/80 relative">
				<AuthSidebar
					items={sidebarItems}
					currentPath={path}
					showPromo={showPromo}
					setShowPromo={setShowPromo}
					appVersion={__APP_VERSION__}
					buildNumber={__BUILD_NUMBER__}
					commitHash={__COMMIT_HASH__}
				/>

				<main
					className={cn(
						"flex-1 bg-white relative rounded-[12px] md:rounded-lg overflow-y-auto",
						sidebarItems.length <= 1 ? "rounded-l-[12px] md:rounded-l-lg" : "",
					)}
				>
					{isLoading ? (
						<div className="p-8 space-y-4">
							<Skeleton className="h-4 w-48 rounded" />
							<Skeleton className="h-20 w-full rounded" />
						</div>
					) : sessionError ? (
						<div className="p-8 text-red-500 bg-red-50 rounded-lg m-4 border border-red-200">
							<h3 className="font-bold text-lg mb-2">
								{t("error.load_session_failed")}
							</h3>
							<p className="font-mono text-sm">{String(sessionError)}</p>
						</div>
					) : !session ? (
						<div className="p-8 text-amber-600 bg-amber-50 rounded-lg m-4 border border-amber-200">
							<h3 className="font-bold text-lg mb-2">
								{t("error.empty_session")}
							</h3>
							<p className="text-sm">{t("error.empty_session_desc")}</p>
						</div>
					) : (
						<Outlet />
					)}
				</main>
			</div>

			<MobileNav
				items={[
					{
						to: "/dashboard",
						label: t("nav.dashboard"),
						icon: LayoutDashboard,
					},
					{
						to: "/pos",
						label: t("nav.operations", "Operasional"),
						icon: Projects,
						activePaths: [
							"/pos",
							"/orders",
							"/products",
							"/boardings",
							"/occupancy",
							"/customers",
						],
					},
					{ to: "/accounting", label: t("nav.accounting"), icon: ChartIcon },
					{ to: "/branches", label: t("nav.parent_management"), icon: Domains },
				]}
				currentPath={path}
			/>

			{isIdle && hasPinSet && <PinLockScreen onUnlock={unlock} />}
		</div>
	);
}
