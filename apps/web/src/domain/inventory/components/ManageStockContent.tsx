import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
	AddBatchDocType,
	AdjustStockDocType,
} from "@/domain/inventory/inventory.doctype";
import type { TProductDto } from "@/domain/product";
import type { TProductId } from "@/domain/product/product.types";
import {
	addBatch,
	deductStock,
	getBatches,
} from "@/lib/api/inventory.functions";
import { FormBuilder } from "@/lib/form-builder";
import { invalidateProducts } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import type { TLanguage } from "@/shared/types/i18n.types";
import { formatCurrency, formatDate } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import { EmptyState } from "@/ui";

type AddBatchValues = {
	variantId: string;
	quantity: number;
	costPrice: number;
	expiryDate?: string;
	supplier?: string;
};

type AdjustStockValues = {
	variantId: string;
	quantity: number;
	type: "IN" | "OUT" | "ADJUST_LOSS" | "ADJUST_FOUND";
	reason: string;
};

export function ManageStockContent({
	product,
	onSuccess,
}: {
	product: TProductDto;
	onSuccess: () => void;
}) {
	const queryClient = useQueryClient();
	const { t, i18n: i18nInstance } = useTranslation();
	const [activeTab, setActiveTab] = useState<
		"batches" | "add_batch" | "adjust"
	>("batches");

	const { data: batches, isLoading } = useQuery({
		queryKey: queryKeys.inventory.productBatches(product.id as string),
		queryFn: () => getBatches({ data: product.id as TProductId }),
	});

	const addBatchMutation = useMutation({
		mutationFn: (values: AddBatchValues) =>
			addBatch({
				data: {
					productId: product.id as TProductId,
					...values,
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.batch_added"),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.inventory.productBatches(product.id as string),
			});
			invalidateProducts(queryClient);
			setActiveTab("batches");
			onSuccess();
		},
		onError: (error) =>
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			}),
	});

	const adjustMutation = useMutation({
		mutationFn: (values: AdjustStockValues) =>
			deductStock({
				data: {
					productId: product.id as TProductId,
					...values,
				},
			}),
		onSuccess: () => {
			toast.success(i18n.t("common.success_title"), {
				description: t("inventory.toast_adjust_success"),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.inventory.productBatches(product.id as string),
			});
			invalidateProducts(queryClient);
			setActiveTab("batches");
			onSuccess();
		},
		onError: (error) =>
			toast.error(i18n.t("common.error_title"), {
				description: extractErrorMessage(
					error,
					t("inventory.toast_adjust_error"),
				),
			}),
	});

	// Prepare variant options for select
	const variantOptions = product.variants.map((v) => ({
		value: v.id,
		label: v.name || "Default",
	}));

	return (
		<div className="space-y-6">
			<div className="flex bg-neutral-100 p-1 rounded-lg">
				<button
					type="button"
					onClick={() => setActiveTab("batches")}
					className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
						activeTab === "batches"
							? "bg-white text-neutral-900 shadow-sm"
							: "text-neutral-500 hover:text-neutral-700"
					}`}
				>
					{t("inventory.active_batches")}
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("add_batch")}
					className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
						activeTab === "add_batch"
							? "bg-white text-neutral-900 shadow-sm"
							: "text-neutral-500 hover:text-neutral-700"
					}`}
				>
					{t("inventory.add_batch_tab")}
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("adjust")}
					className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
						activeTab === "adjust"
							? "bg-white text-neutral-900 shadow-sm"
							: "text-neutral-500 hover:text-neutral-700"
					}`}
				>
					{t("inventory.adjust_stock")}
				</button>
			</div>

			{activeTab === "batches" && (
				<div className="space-y-4">
					{isLoading ? (
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<div
									key={i}
									className="p-4 border border-neutral-200 rounded-xl bg-white shadow-sm space-y-2"
								>
									<Skeleton className="h-4 w-32 rounded-lg" />
									<Skeleton className="h-3 w-24 rounded-lg" />
								</div>
							))}
						</div>
					) : !batches || batches.length === 0 ? (
						<EmptyState
							title={t("inventory.no_active_batches")}
							description={t("inventory.add_batch_desc")}
						/>
					) : (
						<div className="space-y-3">
							{batches.map((batch) => {
								const variant = product.variants.find(
									(v) => v.id === batch.variantId,
								);
								return (
									<div
										key={batch.id}
										className="p-4 border border-neutral-200 rounded-xl bg-white shadow-sm"
									>
										<div className="flex justify-between items-start mb-2">
											<div>
												<div className="text-sm font-bold text-neutral-900">
													{batch.batchNumber || "NO-BATCH"}
												</div>
												<div className="text-xs text-neutral-500">
													{t("inventory.variant")}: {variant?.name || "Default"}
												</div>
											</div>
											<div className="text-right">
												<div className="text-sm font-bold text-emerald-600">
													{batch.quantity} {variant?.unit || "pcs"}
												</div>
												<div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
													{t("inventory.remaining_stock")}
												</div>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-neutral-50">
											<div>
												<div className="text-[10px] text-neutral-400 uppercase font-bold">
													{t("inventory.expiry_date")}
												</div>
												<div className="text-xs font-medium">
													{batch.expiryDate
														? formatDate(
																new Date(batch.expiryDate),
																i18nInstance.language as TLanguage,
															)
														: "-"}
												</div>
											</div>
											<div className="text-right">
												<div className="text-[10px] text-neutral-400 uppercase font-bold">
													{t("inventory.cost_price")}
												</div>
												<div className="text-xs font-medium">
													{formatCurrency(batch.costPrice)}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{activeTab === "add_batch" && (
				<div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
					<p className="text-sm text-neutral-500">
						{t("inventory.add_batch_desc")}
					</p>
					<FormBuilder
						doctype={{
							...AddBatchDocType,
							fields: AddBatchDocType.fields.map((f) =>
								f.fieldname === "variantId"
									? {
											...f,
											options: variantOptions,
											label: t("inventory.variant"),
										}
									: f,
							),
						}}
						mode="create"
						onSubmit={async (v) => {
							await addBatchMutation.mutateAsync(v as AddBatchValues);
							return { message: t("common.success") };
						}}
					/>
				</div>
			)}

			{activeTab === "adjust" && (
				<div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
					<p className="text-sm text-neutral-500">
						{t("inventory.adjust_desc")}
					</p>
					<FormBuilder
						doctype={{
							...AdjustStockDocType,
							fields: AdjustStockDocType.fields.map((f) =>
								f.fieldname === "variantId"
									? {
											...f,
											options: variantOptions,
											label: t("inventory.variant"),
										}
									: f,
							),
						}}
						mode="create"
						onSubmit={async (v) => {
							await adjustMutation.mutateAsync(v as AdjustStockValues);
							return { message: t("common.success") };
						}}
					/>
				</div>
			)}
		</div>
	);
}
