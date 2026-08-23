import { useCallback, useState } from "react";
import { addProduct, updateProduct } from "@/lib/api/products.functions";
import type { TProductDto } from "../../product.dto";
import type {
	CreateProductCommand,
	UpdateProductCommand,
} from "../../product.schemas";

export type TUseProductFormProps = {
	readonly initialData?: TProductDto;
	readonly onSuccess?: (product: TProductDto) => void;
	readonly onCancel?: () => void;
};

export type TUseProductFormResult = {
	readonly formData: {
		readonly name: string;
		readonly sku: string;
		readonly price: number;
		readonly stock: number;
	};
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly setField: <K extends keyof TUseProductFormResult["formData"]>(
		field: K,
		value: TUseProductFormResult["formData"][K],
	) => void;
	readonly submit: (e: React.FormEvent) => void;
};

export const useProductForm = ({
	initialData,
	onSuccess,
}: TUseProductFormProps): TUseProductFormResult => {
	const [formData, setFormData] = useState({
		name: initialData?.name ?? "",
		sku: initialData?.variants?.[0]?.sku ?? "",
		price: initialData?.variants?.[0]?.price ?? 0,
		stock: initialData?.variants?.[0]?.stock ?? 0,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const setField = useCallback(
		<K extends keyof TUseProductFormResult["formData"]>(
			field: K,
			value: TUseProductFormResult["formData"][K],
		) => {
			setFormData((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	const submit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setIsLoading(true);
			setError(null);

			try {
				let result: TProductDto;
				if (initialData) {
					const command: UpdateProductCommand = {
						id: initialData.id,
						...formData,
						hasVariants: false,
						isActive: true,
					};
					result = await updateProduct({ data: command });
				} else {
					const command: CreateProductCommand = {
						...formData,
						hasVariants: false,
						isActive: true,
					};
					result = await addProduct({ data: command });
				}

				onSuccess?.(result);
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Terjadi kesalahan saat menyimpan produk.";
				setError(message);
			} finally {
				setIsLoading(false);
			}
		},
		[formData, initialData, onSuccess],
	);

	return {
		formData,
		isLoading,
		error,
		setField,
		submit,
	};
};
