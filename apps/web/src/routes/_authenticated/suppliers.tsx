import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	BuildingsLinear as Building,
	MapPointLinear as MapPin,
	PenNewSquareLinear as Pencil,
	PhoneLinear as Phone,
	AddCircleLinear as Plus,
	UserLinear as User,
} from "solar-icon-set";
import { RightSidebar } from "@/components/common/RightSidebar";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import { usePagination } from "@/hooks/use-pagination";
import {
	createSupplier,
	getSuppliers,
	updateSupplier,
} from "@/lib/api/supplier.functions";
import { APP_CONFIG } from "@/lib/constants";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateSuppliers } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
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
import { TablePagination } from "@/ui/table/table-pagination";

export const Route = createFileRoute("/_authenticated/suppliers")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({
		meta: [
			{ title: `${i18n.t("supplier.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("supplier.meta_description"),
			},
		],
	}),
	component: SuppliersPage,
});

function SuppliersPage() {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
		null,
	);
	const [_isDeleteDialogOpen, _setIsDeleteDialogOpen] = useState(false);

	// Form state
	const [formData, setFormData] = useState({
		name: "",
		contactPerson: "",
		email: "",
		phone: "",
		address: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const queryClient = useQueryClient();
	const { t } = useTranslation();

	const {
		data: suppliers = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.suppliers.list(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		queryFn: () => getSuppliers(),
	});

	const { paginatedData: paginatedItems, ...pagination } = usePagination(
		suppliers,
		10,
	);

	const _selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

	const createMutation = useMutation({
		mutationFn: () =>
			createSupplier({
				data: {
					name: formData.name,
					contactPerson: formData.contactPerson || undefined,
					email: formData.email || undefined,
					phone: formData.phone || undefined,
					address: formData.address || undefined,
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("supplier.toast_add_success"),
			});
			invalidateSuppliers(queryClient);
			closeSidebar();
		},
		onError: (error) => {
			toast.error(t("supplier.toast_add_error"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
		onSettled: () => setIsSubmitting(false),
	});

	const updateMutation = useMutation({
		mutationFn: () => {
			if (!selectedSupplierId) return Promise.reject("No supplier selected");
			return updateSupplier({
				data: {
					id: selectedSupplierId,
					name: formData.name,
					contactPerson: formData.contactPerson || undefined,
					email: formData.email || undefined,
					phone: formData.phone || undefined,
					address: formData.address || undefined,
				},
			});
		},
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("supplier.toast_update_success"),
			});
			invalidateSuppliers(queryClient);
			closeSidebar();
		},
		onError: (error) => {
			toast.error(t("supplier.toast_update_error"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
		onSettled: () => setIsSubmitting(false),
	});

	const openSidebarForAdd = () => {
		setSelectedSupplierId(null);
		setFormData({
			name: "",
			contactPerson: "",
			email: "",
			phone: "",
			address: "",
		});
		setSidebarOpen(true);
	};

	const openSidebarForEdit = (id: string) => {
		const supplier = suppliers.find((s) => s.id === id);
		if (supplier) {
			setSelectedSupplierId(id);
			setFormData({
				name: supplier.name,
				contactPerson: supplier.contactPerson || "",
				email: supplier.email || "",
				phone: supplier.phone || "",
				address: supplier.address || "",
			});
			setSidebarOpen(true);
		}
	};

	const closeSidebar = () => {
		setSidebarOpen(false);
		setSelectedSupplierId(null);
	};

	const handleSave = async () => {
		if (!formData.name) {
			toast.error(i18n.t("common.error_title"), {
				description: `${t("supplier.name_label")} ${t("common.required")}`,
			});
			return;
		}

		setIsSubmitting(true);
		if (selectedSupplierId) {
			updateMutation.mutate();
		} else {
			createMutation.mutate();
		}
	};

	if (error) {
		return (
			<ErrorState
				error={error}
				onRetry={() =>
					queryClient.invalidateQueries({
						queryKey: queryKeys.suppliers.list(),
					})
				}
			/>
		);
	}

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("supplier.header_title")}
				description={t("supplier.header_desc")}
				actions={
					<Button onClick={openSidebarForAdd}>
						<Plus className="w-4 h-4 mr-2" /> {t("supplier.add_supplier")}
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
				) : suppliers.length === 0 ? (
					<div className="border border-neutral-200 rounded-xl bg-neutral-50 p-12">
						<EmptyState
							icon={Building}
							title={t("supplier.empty_title")}
							description={t("supplier.empty_desc")}
							action={
								<Button onClick={openSidebarForAdd}>
									{t("supplier.add_supplier")}
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
										key="name"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("supplier.name_label")}
									</div>,
									<div
										key="contact"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("supplier.contact_info")}
									</div>,
									<div
										key="address"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("supplier.address_label")}
									</div>,
									<div
										key="status"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("supplier.status")}
									</div>,
									<div
										key="action"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right"
									>
										{t("supplier.action")}
									</div>,
								]}
								flat
							>
								{paginatedItems.map((supplier) => (
									<TableRow key={supplier.id} className="group">
										<TableCell>
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
													<Building className="w-5 h-5 text-neutral-500" />
												</div>
												<div>
													<div className="text-[14px] font-bold text-neutral-900">
														{supplier.name}
													</div>
													{supplier.contactPerson && (
														<div className="text-[12px] text-neutral-500 flex items-center gap-1 mt-0.5">
															<User className="w-3 h-3" />{" "}
															{supplier.contactPerson}
														</div>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="space-y-1">
												{supplier.phone ? (
													<div className="text-[13px] text-neutral-600 flex items-center gap-1.5">
														<Phone className="w-3.5 h-3.5 text-neutral-400" />{" "}
														{supplier.phone}
													</div>
												) : (
													<span className="text-[13px] text-neutral-400 italic">
														-
													</span>
												)}
												{supplier.email && (
													<div className="text-[12px] text-neutral-500">
														{supplier.email}
													</div>
												)}
											</div>
										</TableCell>
										<TableCell>
											{supplier.address ? (
												<div className="text-[13px] text-neutral-600 flex items-start gap-1.5 max-w-[200px]">
													<MapPin className="w-3.5 h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
													<span className="truncate" title={supplier.address}>
														{supplier.address}
													</span>
												</div>
											) : (
												<span className="text-[13px] text-neutral-400 italic">
													-
												</span>
											)}
										</TableCell>
										<TableCell>
											<StatusBadge
												type={supplier.isActive ? "success" : "neutral"}
												label={
													supplier.isActive
														? t("supplier.active")
														: t("supplier.inactive")
												}
											/>
										</TableCell>
										<TableCell align="right">
											<div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => openSidebarForEdit(supplier.id)}
													className="h-8 w-8 text-neutral-500 hover:text-neutral-900"
												>
													<Pencil className="w-4 h-4" />
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
				title={
					selectedSupplierId
						? t("supplier.edit_supplier")
						: t("supplier.add_supplier")
				}
				footer={
					<div className="flex justify-end gap-3 w-full">
						<Button variant="outline" onClick={closeSidebar}>
							{t("common.cancel")}
						</Button>
						<Button onClick={handleSave} disabled={isSubmitting}>
							{isSubmitting ? t("common.saving") : t("common.save")}
						</Button>
					</div>
				}
			>
				<div className="mb-6 text-sm text-neutral-500">
					{t("supplier.form_desc")}
				</div>
				<div className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="name">
							{t("supplier.name_label")} <span className="text-red-500">*</span>
						</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							placeholder={t("supplier.name_placeholder")}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="contactPerson">
							{t("supplier.contact_pic_label")}
						</Label>
						<Input
							id="contactPerson"
							value={formData.contactPerson}
							onChange={(e) =>
								setFormData({ ...formData, contactPerson: e.target.value })
							}
							placeholder="Contoh: Budi Santoso"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="phone">{t("supplier.phone_label")}</Label>
							<div className="flex rounded-md border border-neutral-200 focus-within:ring-2 focus-within:ring-neutral-900 focus-within:ring-offset-2 transition-all h-10 overflow-hidden bg-white">
								<span className="flex items-center px-3 bg-neutral-100 text-neutral-500 border-r border-neutral-200 text-[14px] font-medium select-none">
									+62
								</span>
								<input
									id="phone"
									type="tel"
									value={formData.phone}
									onChange={(e) => {
										let val = e.target.value.replace(/\D/g, "");
										if (val.startsWith("0")) val = val.substring(1);
										if (val.startsWith("62")) val = val.substring(2);
										setFormData({ ...formData, phone: val });
									}}
									placeholder="81234567890"
									className="flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-muted-foreground min-w-0"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">{t("common.email")}</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="budi@example.com"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="address">{t("supplier.address_label")}</Label>
						<Textarea
							id="address"
							value={formData.address}
							onChange={(e) =>
								setFormData({ ...formData, address: e.target.value })
							}
							placeholder={t("supplier.address_placeholder")}
							rows={4}
						/>
					</div>
				</div>
			</RightSidebar>
		</div>
	);
}
