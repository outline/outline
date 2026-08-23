import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POSCart } from "./POSCart";

vi.mock("@/shared/i18n", () => ({
	useLanguage: vi.fn(() => ({ language: "id" })),
}));

describe("POSCart Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockProps = {
		cart: [],
		totalAmount: 0,
		paymentMethod: "cash" as const,
		processing: false,
		onUpdateQuantity: vi.fn(),
		onRemove: vi.fn(),
		onClear: vi.fn(),
		onSetPaymentMethod: vi.fn(),
		onCheckout: vi.fn(),
		customerId: null,
		customers: [],
		onSetItemDiscount: vi.fn(),
		onSetCustomerId: vi.fn(),
		onCreateCustomer: vi.fn(),
		onSaveDraft: vi.fn(),
	};

	it("should show empty message when cart is empty", () => {
		render(<POSCart {...mockProps} />);
		expect(screen.getByText(/Keranjang Kosong/i)).toBeDefined();
	});

	it("should render items and calculate subtotal", () => {
		const cartItems: React.ComponentProps<typeof POSCart>["cart"] = [
			{
				cartKey: "1",
				productId: "1",
				productName: "Product A",
				variantId: "",
				variantName: "",
				price: 10000,
				unit: "pcs",
				isFractional: false,
				stock: 100,
				cartQuantity: 2,
				discountType: null,
				discountValue: 0,
				discountAmount: 0,
			},
		];
		render(
			<POSCart
				{...mockProps}
				cart={
					cartItems as unknown as React.ComponentProps<typeof POSCart>["cart"]
				}
				totalAmount={20000}
			/>,
		);
		expect(screen.getByText("Product A")).toBeDefined();
		// Use getAllByText because it appears in subtotal and total
		expect(screen.getAllByText(/20\.000/).length).toBeGreaterThan(0);
	});

	it("should trigger checkout when button is clicked", () => {
		const cartItems: React.ComponentProps<typeof POSCart>["cart"] = [
			{
				cartKey: "1",
				productId: "1",
				productName: "Product A",
				variantId: "",
				variantName: "",
				price: 10000,
				unit: "pcs",
				isFractional: false,
				stock: 100,
				cartQuantity: 1,
				discountType: null,
				discountValue: 0,
				discountAmount: 0,
			},
		];
		render(<POSCart {...mockProps} cart={cartItems} />);
		const checkoutBtn = screen.getByRole("button", { name: /Checkout/i });
		fireEvent.click(checkoutBtn);
		expect(mockProps.onCheckout).toHaveBeenCalled();
	});
});
