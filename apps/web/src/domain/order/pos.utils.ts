export const calculateItemDiscountAmount = (
	price: number,
	quantity: number,
	discountType: "percentage" | "fixed" | null,
	discountValue: number,
): number => {
	if (!discountType) return 0;
	if (discountType === "fixed") return discountValue;
	if (discountType === "percentage") {
		return (price * quantity * discountValue) / 100;
	}
	return 0;
};

export const calculateSubtotal = (
	cartItems: readonly {
		readonly price: number;
		readonly cartQuantity: number;
		readonly discountAmount: number;
	}[],
): number => {
	return cartItems.reduce(
		(sum, item) => sum + item.price * item.cartQuantity - item.discountAmount,
		0,
	);
};

export const calculateGlobalDiscountAmount = (
	subtotalAmount: number,
	discountType: "percentage" | "fixed" | null,
	discountValue: number,
): number => {
	if (!discountType) return 0;
	if (discountType === "fixed") return discountValue;
	if (discountType === "percentage") {
		return (subtotalAmount * discountValue) / 100;
	}
	return 0;
};

export const calculateTotalAmount = (
	subtotalAmount: number,
	globalDiscountAmount: number,
): number => {
	return Math.max(0, subtotalAmount - globalDiscountAmount);
};
