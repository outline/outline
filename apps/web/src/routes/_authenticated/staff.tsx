import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	BuildingsLinear as Building,
	Card2Linear as CashierIcon,
	SuitcaseLinear as ManagerIcon,
	CrownMinimalisticLinear as OwnerIcon,
	AddCircleLinear as Plus,
	MagniferLinear as SearchIcon,
	UsersGroupTwoRoundedLinear as StaffIcon,
	TrashBinMinimalisticLinear as Trash2,
} from "solar-icon-set";
import { z } from "zod";
import { RightSidebar } from "@/components/common/RightSidebar";
import { toast } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import { InviteModal } from "@/domain/staff";
import { usePagination } from "@/hooks/use-pagination";
import {
	getStaffMembers,
	inviteStaffBatch,
	removeStaffFromBranch,
} from "@/lib/api/staff.functions";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { generatePDFReport } from "@/lib/report.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateStaff } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLimits } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { cn, formatDate } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import {
	EmptyState,
	ErrorState,
	ImportModal,
	Input,
	PageHeader,
	Table,
	TableCell,
	TableRow,
} from "@/ui";
import { TablePagination } from "@/ui/table/table-pagination";

export const Route = createFileRoute("/_authenticated/staff")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({
		meta: [
			{ title: `${i18n.t("nav.staff")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("staff.meta_description"),
			},
		],
	}),
	component: StaffPage,
});

const _inviteSchema = z.object({
	email: z
		.string()
		.email(i18n.t("error.invalid_email", "Masukkan alamat email yang valid"))
		.max(255, i18n.t("error.max_length", { count: 255 })),
	branchId: z
		.string()
		.min(1, i18n.t("error.branch_required", "Pilih cabang tugas")),
	role: z.enum(["owner", "manager", "kasir", "staff_daycare"]),
});

function StaffPage() {
	const [inviteModalOpen, setInviteModalOpen] = useState(false);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [isFormDirty, setIsFormDirty] = useState(false);
	const [search, setSearch] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");
	const { checkLimit, showUpgradeModal } = useLimits();
	const queryClient = useQueryClient();
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

	const inviteBatchMutation = useMutation({
		mutationFn: inviteStaffBatch,
		onSuccess: () => {
			toast.success(t("toast.staff.invite_success_title"), {
				description: "Proses undang staf massal berjalan di latar belakang.",
			});
			setTimeout(() => {
				invalidateStaff(queryClient);
			}, 2000);
			setIsImportModalOpen(false);
		},
		onError: (error: Error) => {
			toast.error(t("toast.staff.invite_error_title") || t("common.error"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const handleImport = async (data: Record<string, unknown>[]) => {
		try {
			const mappedStaff = data.map((item) => ({
				email: String(item.email || item.Email || ""),
				branchId: String(item.branchId || item.BranchID || ""),
				role: String(
					item.role || item.Role || "staff_daycare",
				).toLowerCase() as import("@/shared/types/common.types").TUserRole,
			}));

			await inviteBatchMutation.mutateAsync({
				data: {
					importRequestId: crypto.randomUUID(),
					rows: mappedStaff,
				},
			});
		} catch (error) {
			console.error("Failed to invite batch staff:", error);
		}
	};

	const {
		data: staffMembers,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: queryKeys.staff.members(),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
		queryFn: () => getStaffMembers(),
	});

	const filteredStaff = useMemo(() => {
		let result = staffMembers || [];
		if (search) {
			const s = search.toLowerCase();
			result = result.filter(
				(m) =>
					m.fullName?.toLowerCase().includes(s) ||
					m.email?.toLowerCase().includes(s),
			);
		}
		if (roleFilter !== "all") {
			result = result.filter((m) => m.role === roleFilter);
		}
		return result;
	}, [staffMembers, search, roleFilter]);

	const { paginatedData, ...pagination } = usePagination(filteredStaff);

	const removeMutation = useMutation({
		mutationFn: (data: { userId: string; branchId: string }) =>
			removeStaffFromBranch({ data }),
		onSuccess: () => {
			toast.success(t("toast.staff.remove_success_title"), {
				description: t("toast.staff.remove_success_desc"),
			});
			invalidateStaff(queryClient);
		},
		onError: (err: Error) =>
			toast.error(t("toast.staff.remove_error_title"), {
				description: extractErrorMessage(
					err,
					t("toast.staff.remove_error_desc"),
				),
			}),
	});

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<RightSidebar
				isOpen={inviteModalOpen}
				onClose={() => {
					setInviteModalOpen(false);
					setIsFormDirty(false);
				}}
				title={t("staff.add_member_team")}
				description={t("staff.add_member_subtitle")}
				hasChanges={isFormDirty}
				onDiscard={() => setIsFormDirty(false)}
			>
				<InviteModal
					onCancel={() => {
						setInviteModalOpen(false);
						setIsFormDirty(false);
					}}
					onSuccess={() => {
						setInviteModalOpen(false);
						setIsFormDirty(false);
						invalidateStaff(queryClient);
					}}
					onDirtyChange={setIsFormDirty}
					hideModal
				/>
			</RightSidebar>

			<PageHeader
				description={t("staff.subtitle")}
				docHref="/docs/staff"
				onExport={() => exportToCSV(staffMembers || [], "staff-list.csv")}
				onImport={() => setIsImportModalOpen(true)}
				onReport={() => {
					generatePDFReport({
						title: t("staff.report_title"),
						businessName: APP_CONFIG.name,
						date: formatDate(new Date(), "id"),
						sections: [
							{
								title: t("staff.staff_summary"),
								items: [
									{
										label: t("staff.total_members"),
										value: staffMembers?.length || 0,
									},
								],
							},
						],
					});
				}}
				title={t("nav.staff")}
				breadcrumbs={[{ label: APP_CONFIG.name }, { label: t("nav.staff") }]}
				actions={
					<Button
						size="sm"
						onClick={() => {
							if (!checkLimit("staff")) {
								showUpgradeModal("staff");
								return;
							}
							setInviteModalOpen(true);
						}}
					>
						{t("staff.add_member")}
					</Button>
				}
			/>

			<ImportModal
				isOpen={isImportModalOpen}
				onClose={() => setIsImportModalOpen(false)}
				onImport={handleImport}
				title={t("staff.import_title")}
				description={t("staff.import_description")}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				{isLoading ? (
					<div className="space-y-6">
						<div className="flex gap-4">
							<Skeleton className="col-span-5 h-4 w-32" />
							<Skeleton className="col-span-3 h-4 w-24" />
							<Skeleton className="col-span-3 h-4 w-24" />
						</div>
						<div className="divide-y divide-neutral-100">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="grid grid-cols-12 gap-4 px-6 py-4 items-center"
								>
									<div className="col-span-5 flex items-center gap-3">
										<Skeleton className="h-10 w-10 rounded-full" />
										<div className="space-y-2 flex-1">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-3 w-24" />
										</div>
									</div>
									<div className="col-span-3">
										<Skeleton className="h-5 w-20 rounded-full" />
									</div>
									<div className="col-span-3">
										<Skeleton className="h-4 w-32" />
									</div>
									<div className="col-span-1">
										<Skeleton className="h-8 w-8 rounded-lg" />
									</div>
								</div>
							))}
						</div>
					</div>
				) : isError ? (
					<ErrorState onRetry={() => refetch()} />
				) : staffMembers?.length === 0 ? (
					<EmptyState
						variant="staff"
						title={t("staff.no_members")}
						description={t("staff.description")}
						className="mt-12 mx-auto max-w-xl bg-white "
						action={
							<Button
								size="lg"
								onClick={() => {
									if (!checkLimit("staff")) {
										showUpgradeModal("staff");
										return;
									}
									setInviteModalOpen(true);
								}}
								className="mt-4"
							>
								<Plus className="w-5 h-5" /> {t("staff.add_member_first")}
							</Button>
						}
					/>
				) : (
					<div className="bg-white animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
						<div className="flex gap-4">
							<div className="relative max-w-sm flex-1">
								<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
								<Input
									placeholder={t(
										"staff.search_placeholder",
										"Cari nama atau email...",
									)}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-9 h-10"
								/>
							</div>
							<Select value={roleFilter} onValueChange={setRoleFilter}>
								<SelectTrigger className="w-[180px] h-10">
									<SelectValue
										placeholder={t("staff.filter_role", "Filter Peran")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										{t("common.all", "Semua Peran")}
									</SelectItem>
									<SelectItem value="owner">
										{t("staff.roles.owner")}
									</SelectItem>
									<SelectItem value="manager">
										{t("staff.roles.manager")}
									</SelectItem>
									<SelectItem value="kasir">
										{t("staff.roles.kasir")}
									</SelectItem>
									<SelectItem value="staff_daycare">
										{t("staff.roles.staff_daycare")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<Table
							headers={[
								<div
									key="name"
									className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-2"
								>
									{t("staff.name_contact")}
								</div>,
								<div
									key="role"
									className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest"
								>
									{t("staff.role")}
								</div>,
								<div
									key="branch"
									className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest"
								>
									{t("staff.assigned_branch")}
								</div>,
								<div key="action"></div>,
							]}
							flat
						>
							{paginatedData.map((member) => {
								const roleInfo =
									ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] ||
									ROLE_CONFIG.staff_daycare;
								const RoleIcon = roleInfo.icon;

								return (
									<TableRow key={member.userId} className="group">
										<TableCell className="w-[40%]">
											<div className="flex items-center gap-4 pl-2">
												<Avatar className="w-10 h-10">
													<AvatarImage src="" />
													<AvatarFallback seed={member.fullName || "User"}>
														{member.fullName?.charAt(0) || "?"}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<Link
														to="/staff/$staffId"
														params={{ staffId: member.userId }}
														className="text-[14px] font-bold text-neutral-900 truncate hover:text-blue-600 transition-colors"
													>
														{member.fullName}
													</Link>
													<div className="text-[12px] text-neutral-500 truncate mt-0.5">
														{member.email}
													</div>
												</div>
											</div>
										</TableCell>

										<TableCell className="w-[25%]">
											<span
												className={cn(
													"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ",
													roleInfo.color,
												)}
											>
												<RoleIcon className="w-3.5 h-3.5" />
												{roleInfo.label}
											</span>
										</TableCell>

										<TableCell className="w-[25%]">
											<div className="flex flex-wrap gap-1.5">
												{member.branches?.map(
													(branch: { id: string; name: string }) => (
														<span
															key={branch.id}
															className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-100"
														>
															<Building className="w-3 h-3" />
															{branch.name}
														</span>
													),
												)}
											</div>
										</TableCell>

										<TableCell align="right" className="w-[10%] pr-6">
											<div className="flex justify-end">
												{member.branches?.map(
													(branch: { id: string; name: string }) => (
														<Button
															key={branch.id}
															size="sm"
															variant="outline"
															onClick={() => {
																if (
																	confirm(
																		t("staff.remove_member_from", {
																			fullName: member.fullName,
																			branch: branch.name,
																		}),
																	)
																) {
																	removeMutation.mutate({
																		userId: member.userId,
																		branchId: branch.id,
																	});
																}
															}}
															className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
															title={t("staff.remove_from", {
																branch: branch.name,
															})}
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													),
												)}
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</Table>
						{staffMembers && staffMembers.length > 0 && (
							<TablePagination {...pagination} />
						)}
					</div>
				)}
			</div>
		</div>
	);
}
