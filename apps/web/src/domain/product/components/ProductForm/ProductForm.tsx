import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import {
	addProduct,
	addVariant,
	deleteVariant,
	updateProduct,
	updateVariant,
} from "@/lib/api/products.functions";
import { FormBuilder } from "@/lib/form-builder/form-builder";
import { invalidateProducts } from "@/shared/cache/invalidation";
import { i18n } from "@/shared/i18n/i18n.config";
import { extractErrorMessage } from "@/shared/utils/error";
import { uploadFile } from "@/shared/utils/upload";
import { ProductDocType } from "../../product.doctype";
import type { TProductDto } from "../../product.dto";
import type { TProductUnit } from "../../product.types";

export type TProductFormProps = {
	readonly initialData?: TProductDto;
	readonly onSuccess?: (product: TProductDto) => void;
	readonly onCancel?: () => void;
};

export const ProductForm = ({
	initialData,
	onSuccess,
	onCancel,
}: TProductFormProps) => {
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const isEditing = !!initialData;

	const initialValues = useMemo(() => {
		if (!initialData) return undefined;
		const defaultVariant = initialData.variants?.[0];

		return {
			name: initialData.name,
			category: initialData.category,
			brand: initialData.brand,
			description: initialData.description,
			imageUrl: initialData.imageUrl ?? null,
			isActive: initialData.isActive,
			hasVariants: initialData.hasVariants,

			// Single product flat fields
			...(!initialData.hasVariants && defaultVariant
				? {
						price: defaultVariant.price,
						stock: defaultVariant.stock,
						unit: defaultVariant.unit,
						isFractional: defaultVariant.isFractional,
					}
				: {}),

			// Variants
			variants: initialData.hasVariants
				? initialData.variants?.map((v) => ({
						_id: v.id,
						name: v.name,
						sku: v.sku,
						price: v.price,
						stock: v.stock,
						unit: v.unit,
						isFractional: v.isFractional,
						isActive: v.isActive,
					}))
				: [],
		};
	}, [initialData]);

	const handleSubmit = useCallback(
		async (values: Record<string, unknown>) => {
			try {
				let result: TProductDto;
				const hasVariants = Boolean(values.hasVariants);

				let imageUrl: string | null = null;
				if (values.imageUrl instanceof File) {
					imageUrl = await uploadFile(
						"product-images",
						values.imageUrl,
						initialData?.id ?? crypto.randomUUID(),
					);
				} else if (typeof values.imageUrl === "string") {
					imageUrl = values.imageUrl;
				}

				// Prepare variants to process
				const variantsToProcess = hasVariants
					? (values.variants as Array<Record<string, unknown>>) || []
					: [
							{
								name: "Default",
								price: values.price,
								stock: values.stock,
								unit: values.unit,
								isFractional: values.isFractional,
								isActive: true,
							},
						];

				if (isEditing && initialData) {
					result = await updateProduct({
						data: {
							id: initialData.id,
							name: String(values.name),
							category: (values.category as string) || null,
							description: (values.description as string) || null,
							brand: (values.brand as string) || null,
							imageUrl,
							hasVariants,
							isActive: Boolean(values.isActive),
						},
					});

					// Sync variants
					for (const v of variantsToProcess) {
						if (v._id) {
							// For FormBuilder tables, we don't track isDirty per row natively yet,
							// so we just update if it has _id
							await updateVariant({
								data: {
									id: v._id,
									productId: initialData.id,
									name: v.name,
									sku: v.sku || null,
									barcode: v.barcode || null,
									price: Number(v.price),
									stock: Number(v.stock),
									unit: v.unit as TProductUnit,
									isFractional: Boolean(v.isFractional),
									isActive: v.isActive ?? true,
								},
							});
						} else {
							await addVariant({
								data: {
									productId: initialData.id,
									name: v.name || "Default",
									sku: v.sku || null,
									barcode: v.barcode || null,
									price: Number(v.price),
									stock: Number(v.stock),
									unit: v.unit as TProductUnit,
									isFractional: Boolean(v.isFractional),
									isActive: v.isActive ?? true,
								},
							});
						}
					}

					// Delete removed variants
					if (hasVariants) {
						const currentIds = new Set(
							variantsToProcess.filter((v) => v._id).map((v) => v._id),
						);
						for (const orig of initialData.variants ?? []) {
							if (!currentIds.has(orig.id)) {
								await deleteVariant({ data: orig.id });
							}
						}
					}
				} else {
					result = await addProduct({
						data: {
							name: String(values.name),
							category: (values.category as string) || null,
							description: (values.description as string) || null,
							brand: (values.brand as string) || null,
							imageUrl,
							hasVariants,
							isActive: Boolean(values.isActive),
						},
					});

					// Create variants for new product
					for (const v of variantsToProcess) {
						await addVariant({
							data: {
								productId: result.id,
								name: v.name || "Default",
								sku: v.sku || null,
								barcode: v.barcode || null,
								price: Number(v.price),
								stock: Number(v.stock),
								unit: v.unit as TProductUnit,
								isFractional: Boolean(v.isFractional),
								isActive: v.isActive ?? true,
							},
						});
					}
				}

				invalidateProducts(queryClient);
				toast.success(i18n.t("common.success_title"), {
					description: isEditing
						? t("product_page.toast_update_success")
						: t("product_page.toast_add_success"),
				});
				onSuccess?.(result);
				return {};
			} catch (err) {
				toast.error(i18n.t("common.error_title"), {
					description: extractErrorMessage(
						err,
						t("product_page.toast_save_error"),
					),
				});
				return {
					error: true,
					message: extractErrorMessage(err, t("product_page.toast_save_error")),
				};
			}
		},
		[isEditing, initialData, queryClient, onSuccess, t],
	);

	return (
		<FormBuilder
			doctype={ProductDocType}
			initialValues={initialValues || {}}
			mode={isEditing ? "edit" : "create"}
			onSubmit={handleSubmit}
			onCancel={onCancel ?? (() => {})}
		/>
	);
};
