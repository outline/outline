import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "./ProductForm";
import type { TProductDto } from "../../product.dto";

// Mock the API functions
vi.mock("@/lib/api/products.functions", () => ({
	addProduct: vi.fn(),
	updateProduct: vi.fn(),
}));

// Mock toast
vi.mock("@/components/ui", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

// Polyfill ResizeObserver for Radix UI components
globalThis.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

const createWrapper = () => {
	const queryClient = new QueryClient();
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("ProductForm Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render form fields correctly", () => {
		render(<ProductForm />, { wrapper: createWrapper() });
		expect(screen.getByLabelText(/Nama Produk/i)).toBeDefined();
		expect(screen.getByLabelText(/Harga Jual/i)).toBeDefined();
		expect(screen.getByLabelText(/Stok/i)).toBeDefined();
	});

	it("should render submit button", () => {
		render(<ProductForm />, { wrapper: createWrapper() });
		const submitButton = screen.getByRole("button", { name: /Simpan/i });
		expect(submitButton).toBeInTheDocument();
	});

	it("should render cancel button when onCancel provided", () => {
		render(<ProductForm onCancel={vi.fn()} />, { wrapper: createWrapper() });
		const cancelButton = screen.getByRole("button", { name: /Batal/i });
		expect(cancelButton).toBeInTheDocument();
	});

	it("should render an image upload control for the product photo", () => {
		render(<ProductForm />, { wrapper: createWrapper() });
		expect(
			screen.getByText(/Klik atau tarik gambar ke sini/i),
		).toBeInTheDocument();
	});

	it("should clear imageUrl to null when removing an existing product image", async () => {
		const { updateProduct } = await import("@/lib/api/products.functions");
		const onSuccess = vi.fn();

		const initialData: TProductDto = {
			id: "prod-123",
			name: "Test Product",
			category: "food",
			description: "Test description",
			brand: "Test Brand",
			imageUrl: "https://example.com/image.jpg",
			hasVariants: false,
			isActive: true,
			isFeatured: false,
			variants: [
				{
					id: "var-1",
					productId: "prod-123",
					name: "Default",
					sku: null,
					barcode: null,
					price: 10000,
					costPrice: 5000,
					unit: "pcs",
					isFractional: false,
					stock: 100,
					lowStockThreshold: 10,
					isActive: true,
					sortOrder: 0,
					isLowStock: false,
					isOutOfStock: false,
				},
			],
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		};

		const { container } = render(
			<ProductForm initialData={initialData} onSuccess={onSuccess} />,
			{ wrapper: createWrapper() },
		);

		// Find the remove button (button containing Trash2 icon)
		const removeButton = Array.from(container.querySelectorAll("button")).find(
			(button) =>
				button.querySelector("svg") !== null &&
				button.classList.contains("hover:text-rose-600"),
		);

		expect(removeButton).toBeDefined();
		fireEvent.click(removeButton!);

		// Submit the form
		const submitButton = screen.getByRole("button", { name: /Simpan/i });
		fireEvent.click(submitButton);

		// Verify updateProduct was called with imageUrl: null
		expect(updateProduct).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					imageUrl: null,
				}),
			}),
		);
	});
});
