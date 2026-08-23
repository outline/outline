import { Link } from "@tanstack/react-router";
import {
	BoxBold as BoxIcon,
	MenuDotsLinear as DotsIcon,
	WidgetBold as PagesIcon,
} from "solar-icon-set";

import { DashboardCard } from "@/ui";

export type TInventoryStatusItem = {
	name: string;
	status: "Low Stock" | "In Stock" | "Out of Stock";
	time: string;
};

export type TOccupancyCardProps = {
	readonly activeBoardings: number;
	readonly totalCapacity: number;
	readonly inventoryItems: readonly TInventoryStatusItem[];
	readonly totalItems: number;
};

export const OccupancyCard = ({
	totalCapacity,
	inventoryItems,
	totalItems,
}: TOccupancyCardProps) => {
	return (
		<DashboardCard
			title="Inventory Management"
			icon={PagesIcon}
			headerAction={
				<span className="bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-neutral-500">
					{totalItems}
				</span>
			}
			footer={
				<>
					<span className="text-[11px] text-neutral-500 font-medium">
						Capacity: {totalCapacity} Units
					</span>
					<Link
						to="/products"
						className="text-[11px] font-bold text-mint-green hover:underline"
					>
						View Catalog →
					</Link>
				</>
			}
		>
			<div className="p-4 flex flex-col gap-4">
				<div className="divide-y divide-neutral-100">
					{inventoryItems.map((item) => (
						<div
							key={item.name}
							className="py-2.5 flex items-center justify-between group"
						>
							<div className="flex items-center gap-3">
								<div className="w-7 h-7 rounded bg-neutral-50 flex items-center justify-center border border-neutral-100">
									<BoxIcon className="w-3 h-3 text-neutral-400" />
								</div>
								<div>
									<div className="text-[13px] font-semibold text-neutral-900 tracking-tight">
										{item.name}
									</div>
									<div className="text-[11px] text-neutral-400 font-medium">
										{item.status}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-4">
								<span className="text-[11px] text-neutral-400 font-medium">
									{item.time}
								</span>
								<DotsIcon className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-900 transition-colors cursor-pointer" />
							</div>
						</div>
					))}
				</div>
			</div>
		</DashboardCard>
	);
};
