import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getDefaultVariant, type TProductDto } from "@/domain/product";
import { useLanguage } from "@/shared/i18n";
import { cn } from "@/shared/utils";
import { formatCurrency, formatNumber } from "@/shared/utils/format";
import { styles } from "./POSProductGrid.styles";

export type TPOSProductGridProps = {
	readonly products: readonly TProductDto[];
	readonly onAddToCart: (product: TProductDto) => void;
};

export const POSProductGrid = ({
	products,
	onAddToCart,
}: TPOSProductGridProps) => {
	const { language } = useLanguage();
	const { t } = useTranslation();

	return (
		<div className={styles.grid}>
			{products.map((p) => {
				const defaultVariant = getDefaultVariant(p);
				const stock = p.hasVariants
					? p.variants.reduce((acc, v) => acc + (v.isActive ? v.stock : 0), 0)
					: (defaultVariant?.stock ?? 0);

				const activePrices = p.variants
					.filter((v) => v.isActive)
					.map((v) => v.price);
				const minPrice =
					activePrices.length > 0 ? Math.min(...activePrices) : 0;
				const price = p.hasVariants ? minPrice : (defaultVariant?.price ?? 0);

				const sku = p.hasVariants
					? `${p.variants.length} Varian`
					: defaultVariant?.sku || "";

				const isLowStock = stock > 0 && stock < 5;
				const isOutOfStock = stock <= 0;

				return (
					<Button
						key={p.id}
						type="button"
						variant="outline"
						onClick={() => onAddToCart(p)}
						disabled={isOutOfStock}
						className={cn(
							styles.productCard,
							isOutOfStock ? styles.disabledCard : styles.activeCard,
						)}
					>
						<div className={styles.name}>{p.name}</div>
						<div className={styles.sku}>
							{sku || t("product.no_sku", "Tanpa SKU")}
						</div>
						<div className={styles.footer}>
							<div className={styles.price}>
								{p.hasVariants ? "Mulai " : ""}
								{formatCurrency(price, language)}
							</div>
							<div
								className={cn(
									styles.badge,
									isOutOfStock
										? styles.badgeEmpty
										: isLowStock
											? styles.badgeLow
											: styles.badgeNormal,
								)}
							>
								{isOutOfStock
									? t("product.out_of_stock")
									: isLowStock
										? `${t("dashboard.low_stock")} (${formatNumber(stock, language as import("@/shared/types/i18n.types").TLanguage)})`
										: `${t("product.stock_label")}: ${formatNumber(stock, language as import("@/shared/types/i18n.types").TLanguage)}`}
							</div>
						</div>
					</Button>
				);
			})}
		</div>
	);
};
