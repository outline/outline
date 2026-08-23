import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	PenNewSquareLinear as EditIcon,
	AddCircleLinear as PlusIcon,
	TrashBinTrashLinear as TrashIcon,
	BoxLinear as WarehouseIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranches } from "@/domain/branch/hooks/use-branch-queries";
import type { TRackLocation, TWarehouse } from "@/domain/warehouse";
import {
	useCreateRackLocation,
	useCreateWarehouse,
	useDeleteRackLocation,
	useDeleteWarehouse,
	useRackLocations,
	useUpdateRackLocation,
	useUpdateWarehouse,
	useWarehouses,
} from "@/domain/warehouse/hooks/use-warehouse-queries";
import { extractErrorMessage } from "@/shared/utils/error";
import {
	Button,
	EmptyState,
	ErrorState,
	Modal,
	StatusBadge,
	Table,
	TableCell,
	TableRow,
} from "@/ui";

export const Route = createFileRoute("/_authenticated/inventory/warehouses")({
	component: WarehousesPage,
});

type TWarehouseForm = {
	readonly branchId: string;
	readonly name: string;
	readonly code: string;
	readonly address: string;
};

type TRackForm = {
	readonly name: string;
	readonly rack: string;
	readonly shelf: string;
	readonly bin: string;
};

const EMPTY_WAREHOUSE_FORM: TWarehouseForm = {
	branchId: "",
	name: "",
	code: "",
	address: "",
};

const EMPTY_RACK_FORM: TRackForm = { name: "", rack: "", shelf: "", bin: "" };

function WarehousesPage() {
	const { t } = useTranslation();

	const warehousesQuery = useWarehouses();
	const branchesQuery = useBranches();
	const createWarehouse = useCreateWarehouse();
	const updateWarehouse = useUpdateWarehouse();
	const deleteWarehouse = useDeleteWarehouse();

	const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
	const rackLocationsQuery = useRackLocations(selectedWarehouseId);
	const createRack = useCreateRackLocation();
	const updateRack = useUpdateRackLocation();
	const deleteRack = useDeleteRackLocation();

	const [editingWarehouse, setEditingWarehouse] = useState<TWarehouse | null>(
		null,
	);
	const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
	const [warehouseForm, setWarehouseForm] =
		useState<TWarehouseForm>(EMPTY_WAREHOUSE_FORM);
	const [deletingWarehouse, setDeletingWarehouse] = useState<TWarehouse | null>(
		null,
	);

	const [editingRack, setEditingRack] = useState<TRackLocation | null>(null);
	const [isRackModalOpen, setIsRackModalOpen] = useState(false);
	const [rackForm, setRackForm] = useState<TRackForm>(EMPTY_RACK_FORM);

	const branches = branchesQuery.data ?? [];
	const warehouses = warehousesQuery.data ?? [];
	const rackLocations = rackLocationsQuery.data ?? [];
	const selectedWarehouse =
		warehouses.find((w) => w.id === selectedWarehouseId) ?? null;

	const branchName = useCallback(
		(branchId: string) =>
			branches.find((b) => b.id === branchId)?.name ?? "\u2014",
		[branches],
	);

	const openCreateWarehouse = useCallback(() => {
		setEditingWarehouse(null);
		setWarehouseForm({
			...EMPTY_WAREHOUSE_FORM,
			branchId: branches[0]?.id ?? "",
		});
		setIsWarehouseModalOpen(true);
	}, [branches]);

	const openEditWarehouse = useCallback((warehouse: TWarehouse) => {
		setEditingWarehouse(warehouse);
		setWarehouseForm({
			branchId: warehouse.branchId,
			name: warehouse.name,
			code: warehouse.code ?? "",
			address: warehouse.address ?? "",
		});
		setIsWarehouseModalOpen(true);
	}, []);

	const submitWarehouse = useCallback(async () => {
		const data = {
			branchId: warehouseForm.branchId,
			name: warehouseForm.name.trim(),
			code: warehouseForm.code.trim() || null,
			address: warehouseForm.address.trim() || null,
		};
		if (!data.branchId || !data.name) return;
		try {
			if (editingWarehouse) {
				await updateWarehouse.mutateAsync({ id: editingWarehouse.id, data });
			} else {
				await createWarehouse.mutateAsync(data);
			}
			toast.success(t("warehouse.toast_saved"));
			setIsWarehouseModalOpen(false);
		} catch (error) {
			toast.error(t("warehouse.toast_error"), {
				description: extractErrorMessage(error),
			});
		}
	}, [warehouseForm, editingWarehouse, createWarehouse, updateWarehouse, t]);

	const confirmDeleteWarehouse = useCallback(async () => {
		if (!deletingWarehouse) return;
		try {
			await deleteWarehouse.mutateAsync(deletingWarehouse.id);
			if (selectedWarehouseId === deletingWarehouse.id) {
				setSelectedWarehouseId("");
			}
			toast.success(t("warehouse.toast_deleted"));
			setDeletingWarehouse(null);
		} catch (error) {
			toast.error(t("warehouse.toast_error"), {
				description: extractErrorMessage(error),
			});
		}
	}, [deletingWarehouse, deleteWarehouse, selectedWarehouseId, t]);

	const openCreateRack = useCallback(() => {
		setEditingRack(null);
		setRackForm(EMPTY_RACK_FORM);
		setIsRackModalOpen(true);
	}, []);

	const openEditRack = useCallback((rack: TRackLocation) => {
		setEditingRack(rack);
		setRackForm({
			name: rack.name,
			rack: rack.rack ?? "",
			shelf: rack.shelf ?? "",
			bin: rack.bin ?? "",
		});
		setIsRackModalOpen(true);
	}, []);

	const submitRack = useCallback(async () => {
		if (!selectedWarehouseId) return;
		const data = {
			warehouseId: selectedWarehouseId,
			name: rackForm.name.trim(),
			rack: rackForm.rack.trim() || null,
			shelf: rackForm.shelf.trim() || null,
			bin: rackForm.bin.trim() || null,
		};
		if (!data.name) return;
		try {
			if (editingRack) {
				await updateRack.mutateAsync({ id: editingRack.id, data });
			} else {
				await createRack.mutateAsync(data);
			}
			toast.success(t("warehouse.toast_rack_saved"));
			setIsRackModalOpen(false);
		} catch (error) {
			toast.error(t("warehouse.toast_error"), {
				description: extractErrorMessage(error),
			});
		}
	}, [selectedWarehouseId, rackForm, editingRack, createRack, updateRack, t]);

	const handleDeleteRack = useCallback(
		async (rack: TRackLocation) => {
			try {
				await deleteRack.mutateAsync(rack.id);
				toast.success(t("warehouse.toast_rack_deleted"));
			} catch (error) {
				toast.error(t("warehouse.toast_error"), {
					description: extractErrorMessage(error),
				});
			}
		},
		[deleteRack, t],
	);

	if (warehousesQuery.isLoading) {
		return (
			<div className="p-6 lg:p-8 space-y-6">
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-40 rounded-lg" />
					<Skeleton className="h-9 w-32 rounded-lg" />
				</div>
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="flex items-center gap-4 p-3 border border-neutral-100 rounded-lg"
							>
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-32 rounded-lg" />
									<Skeleton className="h-3 w-20 rounded-lg" />
								</div>
								<Skeleton className="h-6 w-16 rounded-full" />
							</div>
						))}
					</div>
					<div className="space-y-3">
						<Skeleton className="h-4 w-48 rounded-lg" />
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-10 w-full rounded-lg" />
						))}
					</div>
				</div>
			</div>
		);
	}
	if (warehousesQuery.isError) {
		return (
			<ErrorState
				onRetry={() => {
					void warehousesQuery.refetch();
				}}
			/>
		);
	}

	return (
		<div className="p-6 lg:p-8 space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-neutral-900">
					{t("warehouse.title")}
				</h2>
				<Button
					onClick={openCreateWarehouse}
					className="flex items-center gap-2"
				>
					<PlusIcon className="w-4 h-4" />
					{t("warehouse.add")}
				</Button>
			</div>

			{warehouses.length === 0 ? (
				<EmptyState icon={WarehouseIcon} title={t("warehouse.empty")} />
			) : (
				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
					<Table
						headers={[
							t("warehouse.name"),
							t("warehouse.branch"),
							t("warehouse.status"),
							t("warehouse.actions"),
						]}
					>
						{warehouses.map((warehouse) => (
							<TableRow
								key={warehouse.id}
								className={
									warehouse.id === selectedWarehouseId
										? "bg-mint-green/5 cursor-pointer"
										: "cursor-pointer"
								}
								onClick={() => setSelectedWarehouseId(warehouse.id)}
							>
								<TableCell>
									<div className="font-medium text-neutral-900">
										{warehouse.name}
									</div>
									<div className="text-xs text-neutral-500">
										{warehouse.code ?? "\u2014"}
									</div>
								</TableCell>
								<TableCell>{branchName(warehouse.branchId)}</TableCell>
								<TableCell>
									<StatusBadge
										type={warehouse.isActive ? "success" : "neutral"}
										label={
											warehouse.isActive
												? t("common.active")
												: t("common.inactive")
										}
									/>
								</TableCell>
								<TableCell>
									<div className="flex gap-1">
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												openEditWarehouse(warehouse);
											}}
											title={t("warehouse.edit")}
										>
											<EditIcon className="w-4 h-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												setDeletingWarehouse(warehouse);
											}}
											title={t("warehouse.delete_confirm_title")}
										>
											<TrashIcon className="w-4 h-4 text-rose-500" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</Table>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold text-neutral-900">
								{t("warehouse.racks_title")}
								{selectedWarehouse ? ` \u2014 ${selectedWarehouse.name}` : ""}
							</h3>
							{selectedWarehouse && (
								<Button
									variant="outline"
									size="sm"
									onClick={openCreateRack}
									className="flex items-center gap-1"
								>
									<PlusIcon className="w-4 h-4" />
									{t("warehouse.rack_add")}
								</Button>
							)}
						</div>
						{!selectedWarehouse ? (
							<p className="text-sm text-neutral-500">
								{t("warehouse.select_warehouse")}
							</p>
						) : rackLocationsQuery.isLoading ? (
							<Table
								headers={[
									t("warehouse.rack_name"),
									t("warehouse.rack"),
									t("warehouse.shelf"),
									t("warehouse.bin"),
									t("warehouse.actions"),
								]}
							>
								{[1, 2, 3].map((i) => (
									<TableRow key={i}>
										<TableCell>
											<Skeleton className="h-4 w-24 rounded-lg" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-12 rounded-lg" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-12 rounded-lg" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-12 rounded-lg" />
										</TableCell>
										<TableCell>
											<Skeleton className="h-4 w-16 rounded-lg" />
										</TableCell>
									</TableRow>
								))}
							</Table>
						) : rackLocations.length === 0 ? (
							<p className="text-sm text-neutral-500">
								{t("warehouse.racks_empty")}
							</p>
						) : (
							<Table
								headers={[
									t("warehouse.rack_name"),
									t("warehouse.rack"),
									t("warehouse.shelf"),
									t("warehouse.bin"),
									t("warehouse.actions"),
								]}
							>
								{rackLocations.map((rack) => (
									<TableRow key={rack.id}>
										<TableCell className="font-medium text-neutral-900">
											{rack.name}
										</TableCell>
										<TableCell>{rack.rack ?? "\u2014"}</TableCell>
										<TableCell>{rack.shelf ?? "\u2014"}</TableCell>
										<TableCell>{rack.bin ?? "\u2014"}</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => openEditRack(rack)}
													title={t("warehouse.rack_edit")}
												>
													<EditIcon className="w-4 h-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => void handleDeleteRack(rack)}
												>
													<TrashIcon className="w-4 h-4 text-rose-500" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</Table>
						)}
					</div>
				</div>
			)}

			<Modal
				isOpen={isWarehouseModalOpen}
				onClose={() => setIsWarehouseModalOpen(false)}
				title={editingWarehouse ? t("warehouse.edit") : t("warehouse.add")}
			>
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="warehouse-branch">{t("warehouse.branch")}</Label>
						<select
							id="warehouse-branch"
							className="w-full h-10 rounded-lg border border-neutral-200 px-3 text-sm"
							value={warehouseForm.branchId}
							onChange={(e) =>
								setWarehouseForm({ ...warehouseForm, branchId: e.target.value })
							}
						>
							{branches.map((branch) => (
								<option key={branch.id} value={branch.id}>
									{branch.name}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="warehouse-name">{t("warehouse.name")}</Label>
						<Input
							id="warehouse-name"
							value={warehouseForm.name}
							onChange={(e) =>
								setWarehouseForm({ ...warehouseForm, name: e.target.value })
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="warehouse-code">{t("warehouse.code")}</Label>
						<Input
							id="warehouse-code"
							value={warehouseForm.code}
							onChange={(e) =>
								setWarehouseForm({ ...warehouseForm, code: e.target.value })
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="warehouse-address">{t("warehouse.address")}</Label>
						<Input
							id="warehouse-address"
							value={warehouseForm.address}
							onChange={(e) =>
								setWarehouseForm({ ...warehouseForm, address: e.target.value })
							}
						/>
					</div>
					<div className="flex gap-2 justify-end pt-2">
						<Button
							variant="outline"
							onClick={() => setIsWarehouseModalOpen(false)}
						>
							{t("warehouse.cancel")}
						</Button>
						<Button
							onClick={() => void submitWarehouse()}
							disabled={
								!warehouseForm.name.trim() ||
								!warehouseForm.branchId ||
								createWarehouse.isPending ||
								updateWarehouse.isPending
							}
						>
							{t("warehouse.save")}
						</Button>
					</div>
				</div>
			</Modal>

			<Modal
				isOpen={deletingWarehouse !== null}
				onClose={() => setDeletingWarehouse(null)}
				title={t("warehouse.delete_confirm_title")}
			>
				<div className="space-y-4">
					<p className="text-sm text-neutral-600">
						{t("warehouse.delete_confirm_desc")}
					</p>
					<div className="flex gap-2 justify-end">
						<Button
							variant="outline"
							onClick={() => setDeletingWarehouse(null)}
						>
							{t("warehouse.cancel")}
						</Button>
						<Button
							variant="danger"
							onClick={() => void confirmDeleteWarehouse()}
							disabled={deleteWarehouse.isPending}
						>
							{t("warehouse.confirm_delete")}
						</Button>
					</div>
				</div>
			</Modal>

			<Modal
				isOpen={isRackModalOpen}
				onClose={() => setIsRackModalOpen(false)}
				title={editingRack ? t("warehouse.rack_edit") : t("warehouse.rack_add")}
			>
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="rack-name">{t("warehouse.rack_name")}</Label>
						<Input
							id="rack-name"
							value={rackForm.name}
							onChange={(e) =>
								setRackForm({ ...rackForm, name: e.target.value })
							}
						/>
					</div>
					<div className="grid grid-cols-3 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="rack-rack">{t("warehouse.rack")}</Label>
							<Input
								id="rack-rack"
								value={rackForm.rack}
								onChange={(e) =>
									setRackForm({ ...rackForm, rack: e.target.value })
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="rack-shelf">{t("warehouse.shelf")}</Label>
							<Input
								id="rack-shelf"
								value={rackForm.shelf}
								onChange={(e) =>
									setRackForm({ ...rackForm, shelf: e.target.value })
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="rack-bin">{t("warehouse.bin")}</Label>
							<Input
								id="rack-bin"
								value={rackForm.bin}
								onChange={(e) =>
									setRackForm({ ...rackForm, bin: e.target.value })
								}
							/>
						</div>
					</div>
					<div className="flex gap-2 justify-end pt-2">
						<Button variant="outline" onClick={() => setIsRackModalOpen(false)}>
							{t("warehouse.cancel")}
						</Button>
						<Button
							onClick={() => void submitRack()}
							disabled={
								!rackForm.name.trim() ||
								createRack.isPending ||
								updateRack.isPending
							}
						>
							{t("warehouse.save")}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}
