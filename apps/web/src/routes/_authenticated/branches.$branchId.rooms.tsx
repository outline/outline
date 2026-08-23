import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	PenNewSquareLinear as Pencil,
	AddCircleLinear as Plus,
	BedLinear as RoomIcon,
	TrashBinMinimalisticLinear as Trash2,
	UsersGroupTwoRoundedLinear as Users,
} from "solar-icon-set";
import { RightSidebar } from "@/components/common/RightSidebar";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomDocType } from "@/domain/room/room.doctype";
import { usePagination } from "@/hooks/use-pagination";
import {
	createRoom,
	deleteRoom,
	getRooms,
	updateRoom,
} from "@/lib/api/room.functions";
import { APP_CONFIG } from "@/lib/constants";
import { FormBuilder } from "@/lib/form-builder/form-builder";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateBranches } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatCurrency } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import {
	EmptyState,
	ErrorState,
	PageHeader,
	StatusBadge,
	Table,
	TableCell,
	TableRow,
} from "@/ui";
import { ConfirmDialog } from "@/ui/confirm-dialog/confirm-dialog";
import { TablePagination } from "@/ui/table/table-pagination";

export const Route = createFileRoute(
	"/_authenticated/branches/$branchId/rooms",
)({
	head: () => ({
		meta: [
			{ title: `${i18n.t("rooms.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("rooms.meta_description"),
			},
		],
	}),
	component: RoomsPage,
});

function RoomsPage() {
	const { branchId } = Route.useParams();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [initialValues, setInitialValues] = useState<
		Record<string, unknown> | undefined
	>(undefined);

	const queryClient = useQueryClient();
	const { t, i18n } = useTranslation();

	const {
		data: rooms = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.rooms.byBranch(branchId),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
		queryFn: () => getRooms({ data: { branchId } }),
	});

	const { paginatedData: paginatedItems, ...pagination } = usePagination(
		rooms,
		10,
	);

	const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

	const createMutation = useMutation({
		mutationFn: (values: Record<string, unknown>) =>
			createRoom({
				data: {
					branchId,
					name: values.name as string,
					roomType:
						values.roomType as import("@/domain/room/room.types").TRoom["roomType"],
					capacity: Number(values.capacity),
					dailyRate: Number(values.dailyRate),
					description: (values.description as string) || undefined,
					isActive: Boolean(values.isActive ?? false),
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("success.added"),
			});
			invalidateBranches(queryClient, branchId);
			closeSidebar();
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const updateMutation = useMutation({
		mutationFn: (values: Record<string, unknown>) => {
			if (!selectedRoomId) return Promise.reject("No room selected");
			return updateRoom({
				data: {
					id: selectedRoomId,
					data: {
						name: values.name as string,
						roomType:
							values.roomType as import("@/domain/room/room.types").TRoom["roomType"],
						capacity: Number(values.capacity),
						dailyRate: Number(values.dailyRate),
						description: (values.description as string) || undefined,
						isActive: Boolean(values.isActive ?? false),
					},
				},
			});
		},
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("success.updated"),
			});
			invalidateBranches(queryClient, branchId);
			closeSidebar();
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => {
			if (!selectedRoomId) return Promise.reject("No room selected");
			return deleteRoom({ data: selectedRoomId });
		},
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("success.deleted"),
			});
			invalidateBranches(queryClient, branchId);
			setIsDeleteDialogOpen(false);
			setSelectedRoomId(null);
		},
		onError: (error) => {
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const openSidebarForAdd = () => {
		setSelectedRoomId(null);
		setInitialValues({
			roomType: "standard",
			capacity: 1,
			dailyRate: 0,
			isActive: true,
		});
		setSidebarOpen(true);
	};

	const openSidebarForEdit = (id: string) => {
		const room = rooms.find((r) => r.id === id);
		if (room) {
			setSelectedRoomId(id);
			setInitialValues({
				name: room.name,
				roomType: room.roomType,
				capacity: room.capacity,
				dailyRate: room.dailyRate,
				description: room.description || "",
				isActive: room.isActive,
			});
			setSidebarOpen(true);
		}
	};

	const closeSidebar = () => {
		setSidebarOpen(false);
		setSelectedRoomId(null);
	};

	const handleSave = async (values: Record<string, unknown>) => {
		if (selectedRoomId) {
			await updateMutation.mutateAsync(values);
		} else {
			await createMutation.mutateAsync(values);
		}
		return { message: "Success" };
	};

	if (error) {
		return (
			<ErrorState
				error={error}
				onRetry={() => invalidateBranches(queryClient, branchId)}
			/>
		);
	}

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("rooms.header_title")}
				description={t("rooms.header_desc")}
				breadcrumbs={[
					{ label: APP_CONFIG.name },
					{ label: t("nav.branches"), href: "/branches" },
					{ label: t("rooms.title") },
				]}
				actions={
					<Button onClick={openSidebarForAdd}>
						<Plus className="w-4 h-4 mr-2" /> {t("rooms.add_room")}
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-[60px] w-full rounded-xl" />
						<Skeleton className="h-[60px] w-full rounded-xl" />
						<Skeleton className="h-[60px] w-full rounded-xl" />
					</div>
				) : rooms.length === 0 ? (
					<div className="border border-neutral-200 rounded-xl bg-neutral-50 p-12">
						<EmptyState
							icon={RoomIcon}
							title={t("rooms.empty_title")}
							description={t("rooms.empty_desc")}
							action={
								<Button onClick={openSidebarForAdd}>
									{t("rooms.add_room")}
								</Button>
							}
						/>
					</div>
				) : (
					<div className="flex flex-col h-full space-y-6">
						<div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
							<Table
								headers={[
									<div
										key="info"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("rooms.info_label")}
									</div>,
									<div
										key="capacity"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("rooms.capacity_label")}
									</div>,
									<div
										key="rate"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("rooms.rate_label")}
									</div>,
									<div
										key="status"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("rooms.status_label")}
									</div>,
									<div
										key="action"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right"
									>
										{t("rooms.action_label")}
									</div>,
								]}
								flat
							>
								{paginatedItems.map((room) => (
									<TableRow key={room.id} className="group">
										<TableCell>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
													<RoomIcon className="w-5 h-5 text-orange-600" />
												</div>
												<div>
													<div className="text-[14px] font-bold text-neutral-900">
														{room.name}
													</div>
													<div className="text-[12px] text-neutral-500 uppercase tracking-wide mt-0.5">
														{room.roomType}
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2 text-[13px] text-neutral-600">
												<Users className="w-4 h-4 text-neutral-400" />
												<span>
													{room.capacity} {t("rooms.unit_pets")}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="font-medium text-neutral-900">
												{formatCurrency(
													room.dailyRate,
													i18n.language as "id" | "en",
												)}
											</div>
										</TableCell>
										<TableCell>
											<StatusBadge
												type={room.isActive ? "success" : "neutral"}
												label={
													room.isActive
														? t("rooms.active")
														: t("rooms.inactive")
												}
											/>
										</TableCell>
										<TableCell align="right">
											<div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => openSidebarForEdit(room.id)}
													className="h-8 w-8 text-neutral-500 hover:text-neutral-900"
												>
													<Pencil className="w-4 h-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => {
														setSelectedRoomId(room.id);
														setIsDeleteDialogOpen(true);
													}}
													className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</Table>
						</div>

						<TablePagination {...pagination} />
					</div>
				)}
			</div>

			<RightSidebar
				isOpen={sidebarOpen}
				onClose={closeSidebar}
				title={selectedRoomId ? t("rooms.edit_room") : t("rooms.add_room")}
			>
				<div className="mb-6 text-sm text-neutral-500">
					{t("rooms.form_desc")}
				</div>
				<FormBuilder
					doctype={RoomDocType}
					mode={selectedRoomId ? "edit" : "create"}
					{...(initialValues ? { initialValues } : {})}
					onSubmit={handleSave}
					onCancel={closeSidebar}
				/>
			</RightSidebar>

			<ConfirmDialog
				open={isDeleteDialogOpen}
				title={t("rooms.delete_title")}
				description={t("rooms.delete_confirm", { name: selectedRoom?.name })}
				confirmText={
					deleteMutation.isPending
						? t("rooms.deleting")
						: t("rooms.delete_title")
				}
				cancelText={t("common.cancel")}
				onConfirm={() => deleteMutation.mutate()}
				onOpenChange={(open) => {
					if (!open) {
						setIsDeleteDialogOpen(false);
						setSelectedRoomId(null);
					}
				}}
				variant="destructive"
			/>
		</div>
	);
}
