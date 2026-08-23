import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TProductDto } from "@/domain/product";
import { useLanguage } from "@/shared/i18n";
import type { TLanguage } from "@/shared/types/i18n.types";
import { formatCurrency } from "@/shared/utils/format";
import { styles } from "./ProductList.styles";
import { useProductList } from "./useProductList";

export type TProductListProps = {
	readonly title?: string;
};

export const ProductList = ({ title }: TProductListProps) => {
	const { t } = useTranslation();
	const { products, isLoading, error } = useProductList();
	const { language } = useLanguage();

	const displayTitle = title || t("nav.products");

	if (isLoading) {
		return (
			<div className={styles.container}>
				<h2 className={styles.title}>{displayTitle}</h2>
				<div className={styles.list}>
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className={styles.item}>
							<Skeleton className="h-6 w-3/4 mb-2 rounded-md" />
							<Skeleton className="h-4 w-1/2 mb-4 rounded-md" />
							<Skeleton className="h-5 w-1/3 rounded-md" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return <div className={styles.error}>{error}</div>;
	}

	return (
		<div className={styles.container}>
			<h2 className={styles.title}>{displayTitle}</h2>
			<div className={styles.list}>
				{products.map((product) => (
					<ProductCard
						key={product.id}
						product={product}
						language={language}
						t={t}
					/>
				))}
			</div>
		</div>
	);
};

type TProductCardProps = {
	readonly product: TProductDto;
	readonly language: TLanguage;
	readonly t: (key: string) => string;
};

const ProductCard = ({ product, language, t }: TProductCardProps) => (
	<div className={styles.item}>
		<p className="text-sm font-medium text-neutral-900 mt-1 truncate">
			{product.name}{" "}
			{product.variants[0]?.sku ? `(${product.variants[0].sku})` : ""}
		</p>
		<p className="text-sm text-neutral-500 font-medium">
			{formatCurrency(product.variants[0]?.price || 0, language)}
		</p>
		{product.variants[0]?.isOutOfStock ? (
			<Badge variant="destructive" className="mt-2 w-fit">
				{t("common.out_of_stock")}
			</Badge>
		) : product.variants[0]?.isLowStock ? (
			<Badge variant="secondary" className="mt-2 w-fit">
				{t("common.low_stock")} ({product.variants[0]?.stock})
			</Badge>
		) : null}
	</div>
);
