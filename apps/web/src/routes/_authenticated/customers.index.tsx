import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	AddCircleLinear as AddIcon,
	MagniferLinear as SearchIcon,
} from "solar-icon-set";
import { RightSidebar } from "@/components/common/RightSidebar";
import { toast } from "@/components/ui";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerDetailSheet } from "@/domain/customer/components/CustomerDetailSheet";
import { CustomerForm } from "@/domain/customer/components/CustomerForm";
import { CustomerTable } from "@/domain/customer/components/CustomerTable";
import type { ICustomer } from "@/domain/customer/customer.types";
import {
	useCreateCustomer,
	useCustomers,
	useDeleteCustomer,
	useUpdateCustomer,
} from "@/domain/customer/hooks/use-customer-queries";
import { APP_CONFIG } from "@/lib/constants";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { i18n } from "@/shared/i18n/i18n.config";
import { Button, EmptyState, Input, PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/customers/")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("customers.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("customers.meta_description"),
			},
		],
	}),
	component: CustomersPage,
});

function CustomersPage() {
	const { t } = useTranslation();
	const [search, setSearch] = React.useState("");
	const [debouncedSearch] = useDebounce(search, 500);
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [editingCustomer, setEditingCustomer] =
		React.useState<ICustomer | null>(null);
	const [viewingCustomer, setViewingCustomer] =
		React.useState<ICustomer | null>(null);

	const { data: customers = [], isLoading } = useCustomers(debouncedSearch);

	const createMutation = useCreateCustomer();
	const updateMutation = useUpdateCustomer();
	const deleteMutation = useDeleteCustomer();

	const handleDelete = async (customer: ICustomer) => {
		if (!confirm(t("customers.delete_confirm", { name: customer.fullName })))
			return;
		try {
			await deleteMutation.mutateAsync(customer.id);
			toast.success(t("toast.customer.delete_success_title"), {
				description: t("toast.customer.delete_success_desc"),
			});
		} catch {
			toast.error(t("common.error_title"), {
				description: t("customers.delete_error"),
			});
		}
	};

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full">
			<RightSidebar
				isOpen={!!viewingCustomer}
				onClose={() => setViewingCustomer(null)}
				title={viewingCustomer?.fullName || ""}
				hideHeader
				width="md"
			>
				<CustomerDetailSheet
					customer={viewingCustomer}
					onClose={() => setViewingCustomer(null)}
					onEdit={(cust) => {
						setViewingCustomer(null);
						setEditingCustomer(cust);
					}}
				/>
			</RightSidebar>

			<PageHeader
				title={t("customers.title")}
				description={t("customers.subtitle")}
				docHref="/docs/customers"
				actions={
					<Button
						onClick={() => setIsCreateOpen(true)}
						className="w-full md:w-auto"
					>
						<AddIcon className="w-4 h-4 mr-2" />
						{t("customers.add_new")}
					</Button>
				}
			/>
			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="bg-white animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
					<div className="flex gap-4">
						<div className="relative max-w-sm flex-1">
							<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
							<Input
								placeholder={t("customers.search_placeholder")}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-10"
							/>
						</div>
					</div>

					{isLoading ? (
						<div className="divide-y divide-neutral-100">
							{[1, 2, 3, 4, 5].map((i) => (
								<div key={i} className="flex items-center gap-4 p-4">
									<Skeleton className="h-10 w-10 rounded-full" />
									<div className="space-y-2 flex-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-24" />
									</div>
									<Skeleton className="h-8 w-24 rounded-lg" />
								</div>
							))}
						</div>
					) : customers.length > 0 ? (
						<CustomerTable
							customers={customers}
							onEdit={setEditingCustomer}
							onDelete={handleDelete}
							onView={setViewingCustomer}
						/>
					) : (
						<EmptyState
							title={t("customers.empty_title")}
							description={
								search ? t("customers.empty_search") : t("customers.empty_desc")
							}
						/>
					)}
				</div>
			</div>

			{/* Create Dialog */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>{t("customers.add_dialog_title")}</DialogTitle>
					</DialogHeader>
					<CustomerForm
						onSubmit={async (values) => {
							try {
								await createMutation.mutateAsync(
									values as unknown as Record<string, unknown>,
								);
								setIsCreateOpen(false);
								toast.success(t("toast.customer.add_success_title"), {
									description: t("toast.customer.add_success_desc"),
								});
								return { message: "Success" };
							} catch (err) {
								return { message: String(err), error: true };
							}
						}}
					/>
				</DialogContent>
			</Dialog>

			{/* Edit Dialog */}
			<Dialog
				open={!!editingCustomer}
				onOpenChange={(open) => !open && setEditingCustomer(null)}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>{t("customers.edit_dialog_title")}</DialogTitle>
					</DialogHeader>
					{editingCustomer && (
						<CustomerForm
							initialValues={editingCustomer}
							onSubmit={async (values) => {
								try {
									await updateMutation.mutateAsync(
										values as unknown as Record<string, unknown>,
									);
									setEditingCustomer(null);
									toast.success(t("toast.customer.update_success_title"), {
										description: t("toast.customer.update_success_desc"),
									});
									return { message: "Success" };
								} catch (err) {
									return { message: String(err), error: true };
								}
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
