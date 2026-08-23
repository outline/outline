import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	ClockSquareLinear as AbsensiIcon,
	AltArrowLeftLinear as ArrowLeft,
	Card2Linear as CashierIcon,
	CalendarLinear as JadwalIcon,
	WalletMoneyLinear as KasbonIcon,
	MoneyBagLinear as KomisiIcon,
	SuitcaseLinear as ManagerIcon,
	CrownMinimalisticLinear as OwnerIcon,
	UserRoundedLinear as ProfilIcon,
	UsersGroupTwoRoundedLinear as StaffIcon,
} from "solar-icon-set";
import { Skeleton } from "@/components/ui/skeleton";
import {
	AnimatedTabs as Tabs,
	AnimatedTabsContent as TabsContent,
	AnimatedTabsList as TabsList,
	AnimatedTabsTrigger as TabsTrigger,
} from "@/components/ui/tabs";
import { CommissionTab } from "@/domain/commission/components/CommissionTab";
import { KasbonTab } from "@/domain/commission/components/KasbonTab";
import { AttendanceTab } from "@/domain/shift/components/AttendanceTab";
import { ShiftTab } from "@/domain/shift/components/ShiftTab";
import { getStaffMembers } from "@/lib/api/staff.functions";
import { APP_CONFIG } from "@/lib/constants";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import type { TUserId } from "@/shared/types/common.types";
import { cn } from "@/shared/utils";
import { ErrorState, PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/staff/$staffId")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("staff.detail_meta_title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("staff.detail_meta_desc"),
			},
		],
	}),
	component: StaffDetailPage,
});

function StaffDetailPage() {
	const { staffId } = Route.useParams();
	const { t } = useTranslation();

	const ROLE_CONFIG = {
		owner: {
			label: t("staff.roles.owner"),
			icon: OwnerIcon,
			color: "bg-neutral-900 text-white",
		},
		manager: {
			label: t("staff.roles.manager"),
			icon: ManagerIcon,
			color: "bg-blue-100 text-blue-700",
		},
		kasir: {
			label: t("staff.roles.kasir"),
			icon: CashierIcon,
			color: "bg-emerald-100 text-emerald-700",
		},
		staff_daycare: {
			label: t("staff.roles.staff_daycare"),
			icon: StaffIcon,
			color: "bg-neutral-100 text-neutral-600",
		},
	};

	const {
		data: staffMembers,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: queryKeys.staff.members(),
		queryFn: () => getStaffMembers(),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
	});

	const member = staffMembers?.find((m) => m.userId === staffId);

	if (isLoading) {
		return (
			<div className="flex flex-col min-h-full">
				<PageHeader
					title={t("staff.detail_meta_title")}
					description={t("common.loading")}
					breadcrumbs={[
						{ label: APP_CONFIG.name },
						{ label: t("nav.staff"), href: "/staff" },
						{ label: "..." },
					]}
				/>
				<div className="p-6 lg:p-8 flex-1 bg-white">
					<Skeleton className="h-40 w-full" />
				</div>
			</div>
		);
	}

	if (isError || !member) {
		return (
			<div className="flex flex-col min-h-full">
				<PageHeader
					title={t("staff.detail_meta_title")}
					description={t("staff.staff_not_found")}
					breadcrumbs={[
						{ label: APP_CONFIG.name },
						{ label: t("nav.staff"), href: "/staff" },
						{ label: t("common.error") },
					]}
				/>
				<div className="p-6 lg:p-8 flex-1 bg-white">
					<ErrorState onRetry={() => refetch()} />
				</div>
			</div>
		);
	}

	const roleInfo =
		ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] ||
		ROLE_CONFIG.staff_daycare;
	const RoleIcon = roleInfo.icon;

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={member.fullName || t("staff.detail_meta_title")}
				description={t("staff.manage_staff_desc", { name: member.fullName })}
				breadcrumbs={[
					{ label: APP_CONFIG.name },
					{ label: t("nav.staff"), href: "/staff" },
					{ label: member.fullName || t("nav.staff") },
				]}
				actions={
					<Link
						to="/staff"
						className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
					>
						<ArrowLeft className="w-4 h-4" />
						{t("common.back")}
					</Link>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-5xl mx-auto">
					<div className="flex items-center gap-6 mb-8 p-6 bg-neutral-50 border border-neutral-200/60 rounded-xl">
						<div className="w-20 h-20 rounded-2xl bg-neutral-900 flex items-center justify-center text-white text-2xl font-bold uppercase flex-shrink-0 shadow-sm">
							{member.fullName?.charAt(0) || "?"}
						</div>
						<div className="flex-1">
							<h2 className="text-2xl font-bold text-neutral-900 mb-1">
								{member.fullName}
							</h2>
							<p className="text-sm text-neutral-500 mb-3">{member.email}</p>
							<div className="flex items-center gap-3">
								<span
									className={cn(
										"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
										roleInfo.color,
									)}
								>
									<RoleIcon className="w-4 h-4" />
									{roleInfo.label}
								</span>
							</div>
						</div>
					</div>

					<Tabs defaultValue="profil" className="w-full">
						<TabsList className="mb-6 w-full justify-start h-auto p-1 bg-neutral-100 rounded-xl">
							<TabsTrigger
								value="profil"
								className="gap-2 text-sm px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
							>
								<ProfilIcon className="w-4 h-4" />
								{t("staff.tabs.profile")}
							</TabsTrigger>
							<TabsTrigger
								value="komisi"
								className="gap-2 text-sm px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
							>
								<KomisiIcon className="w-4 h-4" />
								{t("staff.tabs.commission")}
							</TabsTrigger>
							<TabsTrigger
								value="kasbon"
								className="gap-2 text-sm px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
							>
								<KasbonIcon className="w-4 h-4" />
								{t("staff.tabs.kasbon")}
							</TabsTrigger>
							<TabsTrigger
								value="shift"
								className="gap-2 text-sm px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
							>
								<JadwalIcon className="w-4 h-4" />
								{t("staff.tabs.shift")}
							</TabsTrigger>
							<TabsTrigger
								value="absensi"
								className="gap-2 text-sm px-6 py-2.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
							>
								<AbsensiIcon className="w-4 h-4" />
								{t("staff.tabs.attendance")}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="profil" className="focus-visible:outline-none">
							<div className="p-6 border border-neutral-200/60 rounded-xl bg-white">
								<h3 className="text-lg font-bold text-neutral-900 mb-4">
									{t("staff.general_info")}
								</h3>
								<div className="grid grid-cols-2 gap-y-6 gap-x-12">
									<div>
										<p className="text-sm text-neutral-500 mb-1">
											{t("signup_doctype.full_name_label")}
										</p>
										<p className="font-medium text-neutral-900">
											{member.fullName}
										</p>
									</div>
									<div>
										<p className="text-sm text-neutral-500 mb-1">
											{t("common.email")}
										</p>
										<p className="font-medium text-neutral-900">
											{member.email}
										</p>
									</div>
									<div>
										<p className="text-sm text-neutral-500 mb-1">
											{t("staff.role")}
										</p>
										<p className="font-medium text-neutral-900">
											{roleInfo.label}
										</p>
									</div>
									<div>
										<p className="text-sm text-neutral-500 mb-1">
											{t("staff.join_date")}
										</p>
										<p className="font-medium text-neutral-900">
											{member &&
											"createdAt" in member &&
											typeof member.createdAt === "string"
												? new Date(member.createdAt).toLocaleDateString(
														"id-ID",
														{
															year: "numeric",
															month: "long",
															day: "numeric",
														},
													)
												: "-"}
										</p>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="komisi" className="focus-visible:outline-none">
							<CommissionTab staffId={staffId as TUserId} />
						</TabsContent>

						<TabsContent value="kasbon" className="focus-visible:outline-none">
							<KasbonTab staffId={staffId as TUserId} />
						</TabsContent>

						<TabsContent value="shift" className="focus-visible:outline-none">
							<ShiftTab staffId={staffId as TUserId} />
						</TabsContent>

						<TabsContent value="absensi" className="focus-visible:outline-none">
							<AttendanceTab staffId={staffId as TUserId} />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
