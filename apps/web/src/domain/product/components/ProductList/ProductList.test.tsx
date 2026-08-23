import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TProductDto } from "../../product.dto";
import { ProductList } from "./ProductList";
import { useProductList } from "./useProductList";

vi.mock("./useProductList", () => ({
	useProductList: vi.fn(),
}));

vi.mock("react-i18next", () => ({
	initReactI18next: { type: "3rdParty", init: vi.fn() },
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { language: "id" },
	}),
}));

vi.mock("@/shared/i18n", () => ({
	useLanguage: vi.fn(() => ({ language: "id" })),
}));

describe("ProductList Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should show loading state", () => {
		vi.mocked(useProductList).mockReturnValue({
			products: [],
			isLoading: true,
			error: null,
			refresh: vi.fn(),
		});

		const { container } = render(<ProductList />);
		const skeletons = container.querySelectorAll(".animate-pulse");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("should show error state", () => {
		vi.mocked(useProductList).mockReturnValue({
			products: [],
			isLoading: false,
			error: "Failed to fetch products",
			refresh: vi.fn(),
		});

		render(<ProductList />);
		expect(screen.getByText("Failed to fetch products")).toBeDefined();
	});

	it("should render a list of products", () => {
		const mockProducts = [
			{
				id: "1",
				name: "Product A",
				variants: [
					{
						price: 10000,
						sku: "SKU-A",
						isOutOfStock: false,
						isLowStock: false,
						stock: 10,
					},
				],
			},
			{
				id: "2",
				name: "Product B",
				variants: [
					{
						price: 20000,
						sku: "SKU-B",
						isOutOfStock: true,
						isLowStock: false,
						stock: 0,
					},
				],
			},
		];

		vi.mocked(useProductList).mockReturnValue({
			products: mockProducts as unknown as TProductDto[],
			isLoading: false,
			error: null,
			refresh: vi.fn(),
		});

		render(<ProductList title="Our Inventory" />);
		expect(screen.getByText("Our Inventory")).toBeDefined();
		expect(screen.getByText("Product A (SKU-A)")).toBeDefined();
		expect(screen.getByText("Product B (SKU-B)")).toBeDefined();
		expect(screen.getByText("common.out_of_stock")).toBeDefined();
	});
});
