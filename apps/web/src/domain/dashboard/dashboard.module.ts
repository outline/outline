import type { TInventoryStatusItem, TTopSellerItem } from "./dashboard.types";

export const DashboardModule = {
	processTopSellers: (
		items: readonly {
			productId: string;
			name: string;
			category: string;
			quantity: number;
			revenue: number;
		}[],
	): readonly TTopSellerItem[] => {
		const grouped = new Map<
			string,
			{ name: string; category: string; quantity: number; revenue: number }
		>();

		for (const item of items) {
			if (!item.productId) continue;

			const existing = grouped.get(item.productId);
			if (existing) {
				existing.quantity += item.quantity;
				existing.revenue += item.revenue;
			} else {
				grouped.set(item.productId, {
					name: item.name,
					category: item.category,
					quantity: item.quantity,
					revenue: item.revenue,
				});
			}
		}

		return Array.from(grouped.entries())
			.map(([id, data]) => ({
				id,
				name: data.name,
				category: data.category,
				salesCount: data.quantity,
				revenue: data.revenue,
			}))
			.sort((a, b) => b.salesCount - a.salesCount)
			.slice(0, 5);
	},

	getRelativeTime: (dateStr: string): string => {
		const diffMs = Date.now() - new Date(dateStr).getTime();
		const mins = Math.floor(diffMs / 60000);
		if (mins < 1) return "just now";
		if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
		const days = Math.floor(hours / 24);
		return `${days} day${days === 1 ? "" : "s"} ago`;
	},

	processInventoryItems: (
		products: readonly {
			name: string;
			stock: number;
			updatedAt: string;
		}[],
	): readonly TInventoryStatusItem[] => {
		return products.map((p) => ({
			name: p.name,
			status:
				p.stock === 0
					? "Out of Stock"
					: p.stock <= 5
						? "Low Stock"
						: "In Stock",
			time: DashboardModule.getRelativeTime(p.updatedAt),
		}));
	},
};
