import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShareLinear as ShareIcon } from "solar-icon-set";
import { z } from "zod";
import { RightSidebar } from "@/components/common/RightSidebar";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { BoardingDetail } from "@/domain/boarding/components/BoardingDetail/BoardingDetail";
import { EditBoardingPanel } from "@/domain/boarding/components/BoardingEditForm/EditBoardingPanel";
import { BoardingFilters } from "@/domain/boarding/components/BoardingFilters/BoardingFilters";
import { BoardingForm } from "@/domain/boarding/components/BoardingForm/BoardingForm";
import { PublicShareDialog } from "@/domain/boarding/components/BoardingModals/PublicShareDialog";
import { BoardingTable } from "@/domain/boarding/components/BoardingTable/BoardingTable";
import {
	useBoardings,
	useCompleteBoarding,
	useDeleteBoarding,
	useImportBoardings,
} from "@/domain/boarding/hooks/use-boarding-queries";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { generatePDFReport } from "@/lib/report.functions";
import { invalidateBoardings } from "@/shared/cache/invalidation";
import { useCopyToClipboard, useLimits, useSession } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatDate, PublicLinkUtils } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import { EmptyState, ErrorState, ImportModal, PageHeader } from "@/ui";

const boardingsSearchSchema = z.object({
	status: z
		.enum(["all", "active", "completed", "draft", "cancelled"])
		.optional()
		.catch("all"),
	from: z.string().optional(),
	to: z.string().optional(),
	branch: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/boardings/")({
	validateSearch: (search) => boardingsSearchSchema.parse(search),
	head: () => ({
		meta: [
			{ title: `${i18n.t("nav.boardings")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("boarding.boarding_list_subtitle"),
			},
		],
	}),
	component: BoardingsIndexPage,
});

function BoardingsIndexPage() {
	const { t } = useTranslation();
	const { status, from, to } = Route.useSearch();
	const navigate = Route.useNavigate();
	const queryClient = useQueryClient();
	const { session } = useSession();
	const copy = useCopyToClipboard();

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>(status || "all");
	const [fromDate, setFromDate] = useState<string>(from || "");
	const [toDate, setToDate] = useState<string>(to || "");

	const [isAdding, setIsAdding] = useState(false);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [viewingId, setViewingId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [isShareOpen, setIsShareOpen] = useState(false);
	const [isFormDirty, setIsFormDirty] = useState(false);
	const { checkLimit, showUpgradeModal } = useLimits();

	const publicLink = PublicLinkUtils.getBoardingLink(
		window.location.origin,
		session?.businessSlug,
		session?.businessId,
	);

	useEffect(() => {
		if (status) setStatusFilter(status);
		if (from) setFromDate(from);
		if (to) setToDate(to);
	}, [status, from, to]);

	const { data: boardings = [], isLoading, isError, refetch } = useBoardings();

	const deleteMutation = useDeleteBoarding();
	const completeMutation = useCompleteBoarding();

	const handleFilterChange = (updates: {
		status?: string;
		from?: string;
		to?: string;
	}) => {
		const nextStatus =
			updates.status !== undefined ? updates.status : statusFilter;
		const nextFrom = updates.from !== undefined ? updates.from : fromDate;
		const nextTo = updates.to !== undefined ? updates.to : toDate;

		setStatusFilter(nextStatus);
		setFromDate(nextFrom);
		setToDate(nextTo);

		navigate({
			search: (prev) => ({
				...prev,
				status: nextStatus as
					| "all"
					| "active"
					| "completed"
					| "draft"
					| "cancelled",
				from: nextFrom || undefined,
				to: nextTo || undefined,
			}),
		});
	};

	const filteredBoardings = boardings.filter((b) => {
		const matchesSearch = b.ownerName
			.toLowerCase()
			.includes(searchQuery.toLowerCase());
		const matchesStatus = statusFilter === "all" || b.status === statusFilter;
		const checkInDate = b.checkInDate.split("T")[0] ?? "";
		const matchesFrom = !fromDate || checkInDate >= fromDate;
		const matchesTo = !toDate || checkInDate <= toDate;

		return matchesSearch && matchesStatus && matchesFrom && matchesTo;
	});

	const importBoardingsMutation = useImportBoardings();

	const handleImport = async (data: Record<string, unknown>[]) => {
		try {
			const mappedBoardings = data.map((item) => ({
				ownerName: String(item.ownerName || item.Name || ""),
				ownerPhone: String(item.ownerPhone || item.Phone || ""),
				ownerAddress: String(item.ownerAddress || item.Address || ""),
				branchId: String(item.branchId || ""),
				checkInDate: new Date(String(item.checkInDate || Date.now())),
				estimatedCheckOutDate: new Date(
					String(item.checkOutDate || item.estimatedCheckOutDate || Date.now()),
				),
				pets: [],
				agreementAccepted: true,
			}));

			await importBoardingsMutation.mutateAsync({
				data: {
					importRequestId: crypto.randomUUID(),
					rows: mappedBoardings,
				},
			});
			toast.success(i18n.t("common.success_title"), {
				description: "Proses import penitipan berjalan di latar belakang.",
			});
			setIsImportModalOpen(false);
		} catch (error) {
			console.error("Failed to import boardings:", error);
			toast.error(i18n.t("common.error"), {
				description: extractErrorMessage(error, i18n.t("common.error")),
			});
		}
	};

	return (
		<div className="flex flex-col min-h-full">
			<RightSidebar
				isOpen={isAdding || !!viewingId || !!editingId}
				onClose={() => {
					setIsAdding(false);
					setViewingId(null);
					setEditingId(null);
				}}
				title={
					isAdding
						? t("nav.new_boarding")
						: viewingId
							? t("boarding.detail_title")
							: t("boarding.edit_title")
				}
				hideHeader={!!viewingId}
				hasChanges={isFormDirty}
				onDiscard={() => setIsFormDirty(false)}
				width={isAdding || editingId ? "half" : "md"}
			>
				{isAdding && (
					<BoardingForm
						hideHeader
						onSuccess={() => {
							setIsAdding(false);
							setIsFormDirty(false);
							invalidateBoardings(queryClient);
						}}
						onCancel={() => {
							setIsAdding(false);
							setIsFormDirty(false);
						}}
						onDirtyChange={setIsFormDirty}
					/>
				)}
				{viewingId && (
					<BoardingDetail
						id={viewingId}
						hideHeader
						onClose={() => setViewingId(null)}
					/>
				)}
				{editingId && (
					<EditBoardingPanel
						boardingId={editingId}
						onSuccess={() => {
							setEditingId(null);
							setIsFormDirty(false);
							invalidateBoardings(queryClient);
						}}
						onCancel={() => {
							setEditingId(null);
							setIsFormDirty(false);
						}}
						onDirtyChange={setIsFormDirty}
					/>
				)}
			</RightSidebar>

			<PageHeader
				title={t("boarding.boarding_list")}
				description={t("boarding.boarding_list_subtitle")}
				docHref="/docs/boarding"
				onExport={() => exportToCSV(boardings, "boarding-history.csv")}
				onImport={() => setIsImportModalOpen(true)}
				onReport={() => {
					const active = boardings.filter((b) => b.status === "active").length;
					const completed = boardings.filter(
						(b) => b.status === "completed",
					).length;

					generatePDFReport({
						title: t("boarding.report_title"),
						businessName: session?.businessName || APP_CONFIG.name,
						date: formatDate(new Date(), "id"),
						sections: [
							{
								title: t("boarding.summary_status"),
								items: [
									{
										label: t("boarding.total_boardings"),
										value: boardings.length,
									},
									{
										label: t("boarding.active_boardings_label"),
										value: active,
									},
									{
										label: t("boarding.completed_boardings_label"),
										value: completed,
									},
								],
							},
						],
					});
				}}
				breadcrumbs={[
					{ label: APP_CONFIG.name },
					{ label: t("nav.boardings") },
				]}
				actions={
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							className="h-10 px-4"
							onClick={() => setIsShareOpen(true)}
						>
							<ShareIcon className="w-4 h-4 mr-2" />
							{t("boarding.public_link")}
						</Button>
						<Button
							className=" font-medium h-10 px-4"
							onClick={() => {
								if (!checkLimit("activeBoardings")) {
									showUpgradeModal("activeBoardings");
									return;
								}
								setIsAdding(true);
							}}
						>
							{t("nav.new_boarding")}
						</Button>
					</div>
				}
			/>

			<PublicShareDialog
				isOpen={isShareOpen}
				onOpenChange={setIsShareOpen}
				session={session}
				publicLink={publicLink}
				onCopy={copy}
			/>

			<ImportModal
				isOpen={isImportModalOpen}
				onClose={() => setIsImportModalOpen(false)}
				onImport={handleImport}
				title={t("boarding.import_title")}
				description={t("boarding.import_description")}
			/>

			<div className="p-6 lg:p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
				<BoardingFilters
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					statusFilter={statusFilter}
					onStatusChange={(val) => handleFilterChange({ status: val })}
					fromDate={fromDate}
					toDate={toDate}
					onDateRangeChange={(from, to) => handleFilterChange({ from, to })}
				/>

				{isError ? (
					<ErrorState onRetry={() => refetch()} />
				) : filteredBoardings.length === 0 ? (
					<EmptyState
						variant="search"
						title={i18n.t("boarding.empty_search")}
						description={
							searchQuery || statusFilter !== "all" || fromDate || toDate
								? i18n.t("boarding.empty_search_desc")
								: i18n.t("boarding.empty_records")
						}
					/>
				) : (
					<BoardingTable
						boardings={filteredBoardings}
						isLoading={isLoading}
						onDelete={async (id) => {
							try {
								await deleteMutation.mutateAsync(id);
								toast.success(i18n.t("common.success_title"), {
									description: i18n.t("toast.boarding_deleted"),
								});
							} catch (err) {
								toast.error(i18n.t("common.error_title"), {
									description: extractErrorMessage(
										err,
										t("boarding.delete_error"),
									),
								});
							}
						}}
						onView={setViewingId}
						onEdit={setEditingId}
						onComplete={async (id) => {
							try {
								await completeMutation.mutateAsync(id);
								toast.success(i18n.t("common.success_title"), {
									description: t("boarding.complete_success"),
								});
							} catch (err) {
								toast.error(i18n.t("common.error_title"), {
									description: extractErrorMessage(
										err,
										t("boarding.complete_error"),
									),
								});
							}
						}}
					/>
				)}
			</div>
		</div>
	);
}
