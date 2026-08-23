import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RightSidebar } from "@/components/common/RightSidebar";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BranchCard, BranchForm, type TBranch } from "@/domain/branch";
import { BranchHolidayManager } from "@/domain/branch/components/BranchHolidayManager/BranchHolidayManager";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import {
	deleteBranch,
	getBranches,
	toggleBranchStatus,
} from "@/lib/api/branches.functions";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateBranches } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLimits } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";
import { EmptyState, ErrorState, PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/branches/")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({
		meta: [
			{ title: `${i18n.t("nav.branches")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("branch.meta_description"),
			},
		],
	}),
	component: BranchesPage,
});

function BranchesPage() {
	const [modalOpen, setModalOpen] = useState(false);
	const [editingBranch, setEditingBranch] = useState<TBranch | null>(null);
	const [holidayBranch, setHolidayBranch] = useState<TBranch | null>(null);
	const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
	const [isFormDirty, setIsFormDirty] = useState(false);
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const { checkLimit, showUpgradeModal } = useLimits();

	const {
		data: branchesData = [],
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: queryKeys.branches.list(),
		queryFn: () => getBranches(),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
	});
	const branches = branchesData as unknown as TBranch[];

	const toggleStatusMutation = useMutation({
		mutationFn: (args: { id: string; isActive: boolean }) =>
			toggleBranchStatus({ data: args }),
		onSuccess: (_data, variables) => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.branch_status_updated"),
			});
			invalidateBranches(queryClient, variables.id);
		},
		onError: (err: Error) =>
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(err, t("branch.status_update_error")),
			}),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteBranch({ data: id }),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.branch_deleted"),
			});
			invalidateBranches(queryClient);
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.metrics(),
			});
		},
		onError: (err: Error) =>
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(err, t("branch.delete_error")),
			}),
	});

	const handleDelete = (branch: TBranch) => {
		if (confirm(t("branch.delete_branch_confirm", { name: branch.name }))) {
			deleteMutation.mutate(branch.id);
		}
	};

	const filteredBranches = branches.filter((b) => {
		if (filter === "all") return true;
		if (filter === "active") return b.isActive;
		if (filter === "inactive") return !b.isActive;
		return true;
	});

	const handleFormSuccess = () => {
		toast.success(i18n.t("common.success_title"), {
			description: editingBranch
				? t("branch.update_success")
				: t("branch.add_success"),
		});
		invalidateBranches(queryClient);
		queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() });
		setModalOpen(false);
		setEditingBranch(null);
		setIsFormDirty(false);
	};

	return (
		<div className="flex flex-col min-h-full">
			<RightSidebar
				isOpen={modalOpen || !!editingBranch}
				onClose={() => {
					setModalOpen(false);
					setEditingBranch(null);
					setIsFormDirty(false);
				}}
				title={
					editingBranch ? t("branch.edit_branch") : t("branch.add_branch_new")
				}
				description={
					editingBranch
						? t("branch.edit_branch_desc")
						: t("branch.add_branch_desc")
				}
				hasChanges={isFormDirty}
				onDiscard={() => setIsFormDirty(false)}
			>
				<BranchForm
					branch={editingBranch || undefined}
					onSuccess={handleFormSuccess}
					onCancel={() => {
						setModalOpen(false);
						setEditingBranch(null);
						setIsFormDirty(false);
					}}
					onDirtyChange={setIsFormDirty}
					hideModal
				/>
			</RightSidebar>

			{/* Holiday Manager Sidebar */}
			<RightSidebar
				isOpen={!!holidayBranch}
				onClose={() => setHolidayBranch(null)}
				title={t("branch.manage_holidays")}
				description={
					holidayBranch
						? t("branch.manage_holidays_desc", { name: holidayBranch.name })
						: ""
				}
			>
				{holidayBranch && (
					<BranchHolidayManager
						branchId={holidayBranch.id}
						branchName={holidayBranch.name}
					/>
				)}
			</RightSidebar>

			<PageHeader
				description={t("branch.subtitle")}
				docHref="/docs/branches"
				onExport={() => exportToCSV(branches, "branches-list.csv")}
				title={t("nav.branches")}
				breadcrumbs={[{ label: APP_CONFIG.name }, { label: t("nav.branches") }]}
				actions={
					<div className="flex items-center gap-3">
						<div className="bg-neutral-100 p-0.5 rounded-lg flex items-center">
							<Button
								size="sm"
								variant={filter === "all" ? "default" : "ghost"}
								onClick={() => setFilter("all")}
								className="text-[12px] font-bold"
							>
								{t("common.all")}
							</Button>
							<Button
								size="sm"
								variant={filter === "active" ? "default" : "ghost"}
								onClick={() => setFilter("active")}
								className="text-[12px] font-bold"
							>
								{t("common.active")}
							</Button>
						</div>

						<Button
							size="sm"
							onClick={() => {
								if (!checkLimit("branches")) {
									showUpgradeModal("branches");
									return;
								}
								setModalOpen(true);
							}}
						>
							{t("branch.add_branch")}
						</Button>
					</div>
				}
			/>

			<div className="p-6 lg:p-10 flex-1 bg-white">
				{isLoading ? (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-44 rounded-[20px]" />
						))}
					</div>
				) : isError ? (
					<ErrorState onRetry={() => refetch()} />
				) : branches.length === 0 ? (
					<EmptyState
						variant="branches"
						title={t("branch.no_branches")}
						description={t("branch.no_branches_desc")}
						className="mt-12 mx-auto max-w-xl bg-white "
						action={
							<Button
								size="lg"
								onClick={() => {
									if (!checkLimit("branches")) {
										showUpgradeModal("branches");
										return;
									}
									setModalOpen(true);
								}}
								className="mt-4"
							>
								{t("branch.register_main_branch")}
							</Button>
						}
					/>
				) : (
					<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
						{filteredBranches.map((branch) => (
							<BranchCard
								key={branch.id}
								branch={branch}
								onEdit={setEditingBranch}
								onDelete={handleDelete}
								onToggleStatus={(b) =>
									toggleStatusMutation.mutate({
										id: b.id,
										isActive: !b.isActive,
									})
								}
								onManageHolidays={setHolidayBranch}
							/>
						))}

						{filteredBranches.length === 0 && filter !== "all" && (
							<div className="col-span-full py-20 text-center rounded-lg border border-dashed border-neutral-200 bg-white ">
								<p className="text-neutral-500 font-medium">
									{t("branch.empty_filter")}
								</p>
								<Button
									type="button"
									variant="link"
									onClick={() => setFilter("all")}
									className="text-[13px] font-bold text-neutral-900 mt-4"
								>
									{t("branch.show_all", { all: t("common.all") })}
								</Button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
