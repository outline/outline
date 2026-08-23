import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { APP_CONFIG } from "@/lib/constants";
import { i18n } from "@/shared/i18n/i18n.config";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/inventory")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("inventory.meta_title")} — ${APP_CONFIG.name}` },
			{ name: "description", content: i18n.t("inventory.meta_description") },
		],
	}),
	component: InventoryLayout,
});

function InventoryLayout() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("inventory.header_title")}
				description={t("inventory.header_desc")}
			/>

			<div className="border-b border-neutral-200 bg-white px-6 lg:px-8">
				<div className="flex space-x-6">
					<Link
						to="/inventory"
						className="pb-4 pt-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 border-b-2 border-transparent data-[status=active]:border-neutral-900 data-[status=active]:text-neutral-900"
						activeOptions={{ exact: true }}
					>
						{t("inventory.tab_dashboard")}
					</Link>
					<Link
						to="/inventory/batches"
						className="pb-4 pt-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 border-b-2 border-transparent data-[status=active]:border-neutral-900 data-[status=active]:text-neutral-900"
					>
						{t("inventory.tab_batches")}
					</Link>
					<Link
						to="/inventory/movements"
						className="pb-4 pt-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 border-b-2 border-transparent data-[status=active]:border-neutral-900 data-[status=active]:text-neutral-900"
					>
						{t("inventory.tab_movements")}
					</Link>
					<Link
						to="/inventory/warehouses"
						className="pb-4 pt-3 text-sm font-medium text-neutral-500 hover:text-neutral-900 border-b-2 border-transparent data-[status=active]:border-neutral-900 data-[status=active]:text-neutral-900"
					>
						{t("inventory.tab_warehouses")}
					</Link>
				</div>
			</div>

			<div className="p-6 lg:p-8 flex-1 bg-neutral-50/50">
				<Outlet />
			</div>
		</div>
	);
}
