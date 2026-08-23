import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RightSidebar } from "@/components/common/RightSidebar";
import { toast } from "@/components/ui";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import { ManageStockContent } from "@/domain/inventory/components/ManageStockContent";
import { ProductForm, ProductTable, type TProductDto } from "@/domain/product";
import {
	useDeleteProduct,
	useImportProducts,
	useProducts,
} from "@/domain/product/hooks/use-product-queries";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { generatePDFReport } from "@/lib/report.functions";
import { invalidateProducts } from "@/shared/cache/invalidation";
import { useLimits } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatDate } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import { EmptyState, ErrorState, ImportModal, PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/products")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({
		meta: [
			{ title: `${i18n.t("product_page.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("product_page.meta_description"),
			},
		],
	}),
	component: ProductsPage,
});

function ProductsPage() {
	const { t } = useTranslation();
	const { checkLimit, showUpgradeModal } = useLimits();
	const queryClient = useQueryClient();

	const [isAdding, setIsAdding] = useState(false);
	const [editingProduct, setEditingProduct] = useState<TProductDto | null>(
		null,
	);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [productToDelete, setProductToDelete] = useState<TProductDto | null>(
		null,
	);
	const [stockProduct, setStockProduct] = useState<TProductDto | null>(null);

	const importMutation = useImportProducts();
	const handleImport = async (data: Record<string, unknown>[]) => {
		try {
			const mappedProducts = data.map((item) => ({
				productId: "import",
				name: String(item.name || item.Name || ""),
				sku: item.sku || item.SKU ? String(item.sku || item.SKU) : null,
				price: Number(item.price || item.Price || 0),
				stock: Number(item.stock || item.Stock || 0),
				unit: "pcs",
				isFractional: false,
			}));

			await importMutation.mutateAsync({
				importRequestId: crypto.randomUUID(),
				rows: mappedProducts,
			} as never);

			toast.success(t("toast.product.import_success_title"), {
				description: "Import produk sedang diproses di latar belakang.",
			});
			setTimeout(() => {
				invalidateProducts(queryClient);
			}, 2000);
			setIsImportModalOpen(false);
		} catch (error) {
			console.error("Failed to import products:", error);
			toast.error(t("toast.product.delete_error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		}
	};
	const [isFormDirty, setIsFormDirty] = useState(false);

	const {
		data: products = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useProducts();

	const deleteMutation = useDeleteProduct();

	const handleFormSuccess = () => {
		const message = editingProduct
			? t("product_page.toast_update_success")
			: t("product_page.toast_add_success");
		toast.success(i18n.t("common.success_title"), { description: message });
		invalidateProducts(queryClient);
		setIsAdding(false);
		setEditingProduct(null);
		setIsFormDirty(false);
	};

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<RightSidebar
				isOpen={isAdding || !!editingProduct}
				onClose={() => {
					setIsAdding(false);
					setEditingProduct(null);
					setIsFormDirty(false);
				}}
				title={
					editingProduct
						? t("product.edit_product")
						: t("product.add_product_new")
				}
				hasChanges={isFormDirty}
				onDiscard={() => setIsFormDirty(false)}
			>
				<ProductForm
					{...(editingProduct ? { initialData: editingProduct } : {})}
					onSuccess={handleFormSuccess}
					onCancel={() => {
						setIsAdding(false);
						setEditingProduct(null);
						setIsFormDirty(false);
					}}
				/>
			</RightSidebar>

			<RightSidebar
				isOpen={!!stockProduct}
				onClose={() => setStockProduct(null)}
				title={t("product_page.manage_stock_batch")}
			>
				{stockProduct && (
					<ManageStockContent
						product={stockProduct}
						onSuccess={() => {
							// Kept open but data refetched
						}}
					/>
				)}
			</RightSidebar>

			<PageHeader
				title={t("product_page.header_title")}
				description={t("product_page.header_desc")}
				docHref="/docs/products"
				onExport={() => exportToCSV(products, "product-inventory.csv")}
				onImport={() => setIsImportModalOpen(true)}
				onReport={() => {
					generatePDFReport({
						title: t("product_page.inventory_status_report"),
						businessName: APP_CONFIG.name,
						date: formatDate(new Date(), "id"),
						sections: [
							{
								title: t("product_page.stock_summary"),
								items: [
									{
										label: t("product_page.total_products"),
										value: products.length,
									},
									{
										label: t("dashboard.low_stock"),
										value: products.filter(
											(p) => (p.variants?.[0]?.stock ?? 0) <= 5,
										).length,
									},
								],
							},
						],
					});
				}}
				actions={
					<Button
						type="button"
						onClick={() => {
							if (!isAdding && !checkLimit("products")) {
								showUpgradeModal("products");
								return;
							}
							setIsAdding(true);
							setEditingProduct(null);
						}}
						variant="default"
					>
						{t("product.add_product_new")}
					</Button>
				}
			/>

			<ImportModal
				isOpen={isImportModalOpen}
				onClose={() => setIsImportModalOpen(false)}
				onImport={handleImport}
				title={t("product_page.import_title")}
				description={t("product_page.import_description")}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					{isLoading ? (
						<div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
							<div className="p-4 border-b border-neutral-100 flex gap-4">
								<Skeleton className="h-10 w-full max-w-xs rounded-xl" />
							</div>
							<div className="divide-y divide-neutral-100">
								{[1, 2, 3, 4, 5].map((i) => (
									<div key={i} className="p-4 flex gap-4 items-center">
										<Skeleton className="h-12 w-12 rounded-xl" />
										<div className="space-y-2 flex-1">
											<Skeleton className="h-5 w-48 rounded-lg" />
											<Skeleton className="h-4 w-24 rounded-lg" />
										</div>
										<Skeleton className="h-8 w-20 rounded-lg" />
									</div>
								))}
							</div>
						</div>
					) : isError ? (
						<ErrorState
							error={error as Error}
							onRetry={() => refetch()}
							className="bg-white rounded-2xl border border-neutral-200 shadow-sm"
						/>
					) : products.length === 0 ? (
						<EmptyState
							variant="inventory"
							title={t("product.empty_inventory")}
							description={t("product.empty_inventory_desc")}
							className="bg-white rounded-2xl border border-neutral-200 shadow-sm min-h-[300px]"
							action={
								<Button
									size="lg"
									onClick={() => setIsAdding(true)}
									className="mt-2"
								>
									{t("product.add_product_first")}
								</Button>
							}
						/>
					) : (
						<ProductTable
							products={products}
							onEdit={(p) => {
								setEditingProduct(p);
								setIsAdding(false);
							}}
							onDelete={setProductToDelete}
							onManageStock={(p) => setStockProduct(p)}
						/>
					)}

					<AlertDialog
						open={!!productToDelete}
						onOpenChange={(open) => !open && setProductToDelete(null)}
					>
						<AlertDialogContent className="rounded-2xl border-none shadow-2xl">
							<AlertDialogHeader>
								<AlertDialogTitle className="text-xl font-bold text-neutral-900">
									{t("product.delete_product")}
								</AlertDialogTitle>
								<AlertDialogDescription className="text-[14px] text-neutral-500">
									{t("product.delete_confirm_msg", {
										name: productToDelete?.name,
									})}
									{t("product_page.delete_warning")}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter className="mt-6 gap-3">
								<AlertDialogCancel className="h-11 rounded-xl border-neutral-200 text-[13px] font-medium mt-0">
									{t("common.cancel")}
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={async (e) => {
										e.preventDefault();
										if (!productToDelete) return;
										try {
											await deleteMutation.mutateAsync(productToDelete.id);
											toast.success(t("toast.product.delete_success_title"), {
												description: t("toast.product.delete_success_desc"),
											});
											setProductToDelete(null);
										} catch (error) {
											toast.error(t("toast.product.delete_error_title"), {
												description: extractErrorMessage(
													error,
													t("toast.product.delete_error_desc"),
												),
											});
										}
									}}
									disabled={deleteMutation.isPending}
									className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold shadow-lg shadow-rose-200 disabled:opacity-50"
								>
									{deleteMutation.isPending
										? t("common.deleting")
										: t("product.delete_product_confirm")}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}
