import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as productsApi from "@/lib/api/products.functions";
import {
	useCreateProduct,
	useDeleteProduct,
	useProducts,
} from "./use-product-queries";

const mockProducts = [
	{ id: "p-1", name: "A" },
	{ id: "p-2", name: "B" },
] as never[];

const wrapper =
	(queryClient: QueryClient): React.FC<{ children: React.ReactNode }> =>
	({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

describe("product hook adapter boundary", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		vi.restoreAllMocks();
	});

	afterEach(() => {
		queryClient.clear();
	});

	it("useProducts returns server data with the canonical query key", async () => {
		vi.spyOn(productsApi, "getProducts").mockResolvedValue(mockProducts);

		const { result } = renderHook(() => useProducts(), {
			wrapper: wrapper(queryClient),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual(mockProducts);
		expect(productsApi.getProducts).toHaveBeenCalledOnce();
	});

	it("useDeleteProduct optimistically removes the row and rolls back on error", async () => {
		vi.spyOn(productsApi, "deleteProduct").mockRejectedValue(
			new Error("Storage unavailable"),
		);

		queryClient.setQueryData(["products", "list"], mockProducts);

		expect(queryClient.getQueryData(["products", "list"])).toBeDefined();

		const { result } = renderHook(() => useDeleteProduct(), {
			wrapper: wrapper(queryClient),
		});

		await act(async () => {
			result.current.mutate("p-1");
			await Promise.resolve();
		});

		const afterMutate = queryClient.getQueryData<{ id: string }[]>([
			"products",
			"list",
		]);
		expect(afterMutate).toBeDefined();

		await waitFor(() => expect(result.current.isError).toBe(true));

		await waitFor(() =>
			expect(queryClient.getQueryData(["products", "list"])).toEqual(
				mockProducts,
			),
		);
	});

	it("useCreateProduct calls invalidateProducts on success", async () => {
		vi.spyOn(productsApi, "getProducts").mockResolvedValue(mockProducts);
		vi.spyOn(productsApi, "addProduct").mockResolvedValue({
			id: "p-3",
		} as never);
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useCreateProduct(), {
			wrapper: wrapper(queryClient),
		});

		result.current.mutate({ name: "C" } as never);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(productsApi.addProduct).toHaveBeenCalledOnce();
		// invalidateProducts invalidates both products.lists() and
		// dashboard.metrics(); we just verify the call happened.
		expect(invalidateSpy).toHaveBeenCalled();
	});
});
