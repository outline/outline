import { useCallback, useEffect, useState } from "react";
import type { TProductDto } from "@/domain/product";
import { getProducts } from "@/lib/api/products.functions";

export type TUseProductListResult = {
	readonly products: readonly TProductDto[];
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly refresh: () => void;
};

export const useProductList = (): TUseProductListResult => {
	const [products, setProducts] = useState<readonly TProductDto[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchProducts = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		// Using the Result pattern (explicit branching) instead of try/catch
		const result = await getProducts().catch((e) => {
			console.error("Failed to load products:", e);
			return null;
		});

		if (result === null) {
			setError("Gagal memuat produk. Terjadi kesalahan jaringan.");
		} else {
			setProducts(result);
		}

		setIsLoading(false);
	}, []);

	useEffect(() => {
		fetchProducts();
	}, [fetchProducts]);

	return {
		products,
		isLoading,
		error,
		refresh: fetchProducts,
	};
};
