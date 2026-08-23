import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import type { TProductDto, TProductVariantDto } from "@/domain/product";
import {
	calculateGlobalDiscountAmount,
	calculateItemDiscountAmount,
	calculateSubtotal,
	calculateTotalAmount,
} from "../pos.utils";

export type TCartItem = {
	readonly cartKey: string; // unique: productId + variantId
	readonly productId: string;
	readonly productName: string;
	readonly variantId: string;
	readonly variantName: string;
	readonly price: number;
	readonly unit: string;
	readonly isFractional: boolean;
	readonly stock: number;
	readonly cartQuantity: number;
	readonly discountType: "percentage" | "fixed" | null;
	readonly discountValue: number;
	readonly discountAmount: number;
};

export type TUsePOSCartResult = {
	readonly cart: readonly TCartItem[];
	readonly customerId: string | null;
	readonly subtotalAmount: number;
	readonly totalAmount: number;
	readonly globalDiscountType: "percentage" | "fixed" | null;
	readonly globalDiscountValue: number;
	readonly globalDiscountAmount: number;
	readonly addToCart: (
		product: TProductDto,
		variant: TProductVariantDto,
		qty?: number,
	) => void;
	readonly removeFromCart: (cartKey: string) => void;
	readonly updateQuantity: (cartKey: string, delta: number) => void;
	readonly setItemDiscount: (
		cartKey: string,
		type: "percentage" | "fixed" | null,
		value: number,
	) => void;
	readonly setGlobalDiscount: (
		type: "percentage" | "fixed" | null,
		value: number,
	) => void;
	readonly setCustomerId: (id: string | null) => void;
	readonly loadCart: (draftCart: readonly TCartItem[]) => void;
	readonly clearCart: () => void;
};

export const usePOSCart = (): TUsePOSCartResult => {
	const { t } = useTranslation();
	const [cart, setCart] = useState<readonly TCartItem[]>([]);
	const [customerId, setCustomerId] = useState<string | null>(null);
	const [globalDiscountType, setGlobalDiscountType] = useState<
		"percentage" | "fixed" | null
	>(null);
	const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

	const subtotalAmount = useMemo(() => calculateSubtotal(cart), [cart]);

	const globalDiscountAmount = useMemo(
		() =>
			calculateGlobalDiscountAmount(
				subtotalAmount,
				globalDiscountType,
				globalDiscountValue,
			),
		[subtotalAmount, globalDiscountType, globalDiscountValue],
	);

	const totalAmount = useMemo(
		() => calculateTotalAmount(subtotalAmount, globalDiscountAmount),
		[subtotalAmount, globalDiscountAmount],
	);

	const addToCart = useCallback(
		(product: TProductDto, variant: TProductVariantDto, qty = 1) => {
			if (variant.stock <= 0) {
				toast.error(t("toast.pos.out_of_stock_title"), {
					description: t("toast.pos.out_of_stock_desc", { name: product.name }),
				});
				return;
			}

			const cartKey = `${product.id}__${variant.id}`;

			setCart((current) => {
				const existing = current.find((item) => item.cartKey === cartKey);

				if (existing) {
					// For fractional items, just add the qty on top
					const newQ = existing.cartQuantity + qty;
					if (!variant.isFractional && newQ > variant.stock) {
						toast.error(t("toast.pos.insufficient_stock_title"), {
							description: t("toast.pos.insufficient_stock_desc", {
								name: `${product.name} (${variant.name})`,
							}),
						});
						return current;
					}

					const discountAmount = calculateItemDiscountAmount(
						variant.price,
						newQ,
						existing.discountType,
						existing.discountValue,
					);

					return current.map((item) =>
						item.cartKey === cartKey
							? {
									...item,
									cartQuantity: Number(newQ.toFixed(3)),
									discountAmount,
								}
							: item,
					);
				}

				return [
					...current,
					{
						cartKey,
						productId: product.id,
						productName: product.name,
						variantId: variant.id,
						variantName: variant.name === "Default" ? "" : variant.name,
						price: variant.price,
						unit: variant.unit,
						isFractional: variant.isFractional,
						stock: variant.stock,
						cartQuantity: qty,
						discountType: null,
						discountValue: 0,
						discountAmount: 0,
					},
				];
			});
		},
		[t],
	);

	const removeFromCart = useCallback((cartKey: string) => {
		setCart((current) => current.filter((item) => item.cartKey !== cartKey));
	}, []);

	const updateQuantity = useCallback(
		(cartKey: string, delta: number) => {
			setCart(
				(current) =>
					current
						.map((item) => {
							if (item.cartKey !== cartKey) return item;
							const newQ = Number((item.cartQuantity + delta).toFixed(3));
							if (newQ <= 0) return null;
							if (!item.isFractional && newQ > item.stock) {
								toast.error(t("toast.pos.insufficient_stock_title"), {
									description: t("toast.pos.insufficient_stock_desc", {
										name: item.productName,
									}),
								});
								return item;
							}

							const discountAmount = calculateItemDiscountAmount(
								item.price,
								newQ,
								item.discountType,
								item.discountValue,
							);

							return { ...item, cartQuantity: newQ, discountAmount };
						})
						.filter(Boolean) as TCartItem[],
			);
		},
		[t],
	);

	const setItemDiscount = useCallback(
		(cartKey: string, type: "percentage" | "fixed" | null, value: number) => {
			setCart((current) =>
				current.map((item) => {
					if (item.cartKey !== cartKey) return item;

					const discountAmount = calculateItemDiscountAmount(
						item.price,
						item.cartQuantity,
						type,
						value,
					);

					return {
						...item,
						discountType: type,
						discountValue: value,
						discountAmount,
					};
				}),
			);
		},
		[],
	);

	const setGlobalDiscount = useCallback(
		(type: "percentage" | "fixed" | null, value: number) => {
			setGlobalDiscountType(type);
			setGlobalDiscountValue(value);
		},
		[],
	);

	const loadCart = useCallback((draftCart: readonly TCartItem[]) => {
		setCart(draftCart);
	}, []);

	const clearCart = useCallback(() => {
		setCart([]);
		setCustomerId(null);
		setGlobalDiscountType(null);
		setGlobalDiscountValue(0);
	}, []);

	return {
		cart,
		customerId,
		subtotalAmount,
		totalAmount,
		globalDiscountType,
		globalDiscountValue,
		globalDiscountAmount,
		addToCart,
		removeFromCart,
		updateQuantity,
		setItemDiscount,
		setGlobalDiscount,
		setCustomerId,
		loadCart,
		clearCart,
	};
};
