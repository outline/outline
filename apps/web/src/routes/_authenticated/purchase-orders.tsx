import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	BuildingsLinear as Building,
	CartLargeMinimalisticLinear as CartIcon,
	AddCircleLinear as Plus,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import { usePagination } from "@/hooks/use-pagination";
import { getPurchaseOrders } from "@/lib/api/po.functions";
import { APP_CONFIG } from "@/lib/constants";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLanguage } from "@/shared/i18n";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatDate } from "@/shared/utils/format";
import {
	EmptyState,
	ErrorState,
	PageHeader,
	StatusBadge,
	Table,
	TableCell,
	TableRow,
} from "@/ui";
import { TablePagination } from "@/ui/table/table-pagination";

export const Route = createFileRoute("/_authenticated/purchase-orders")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	head: () => ({
		meta: [
			{ title: `${i18n.t("purchase_order.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("purchase_order.meta_description"),
			},
		],
	}),
	component: PurchaseOrdersPage,
});

function PurchaseOrdersPage() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { language } = useLanguage();

	const {
		data: pos = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: queryKeys.purchaseOrders.list(),
		queryFn: () => getPurchaseOrders(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

	const { paginatedData: paginatedItems, ...pagination } = usePagination(
		pos,
		10,
	);

	if (error) {
		return <ErrorState error={error} onRetry={() => refetch()} />;
	}

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("purchase_order.header_title")}
				description={t("purchase_order.header_desc")}
				actions={
					<Button onClick={() => navigate({ to: "/purchase-orders/new" })}>
						<Plus className="w-4 h-4 mr-2" /> {t("purchase_order.add_new")}
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-[60px] w-full rounded-xl" />
						<Skeleton className="h-[60px] w-full rounded-xl" />
						<Skeleton className="h-[60px] w-full rounded-xl" />
					</div>
				) : pos.length === 0 ? (
					<div className="border border-neutral-200 rounded-xl bg-neutral-50 p-12">
						<EmptyState
							icon={CartIcon}
							title={t("purchase_order.empty_title")}
							description={t("purchase_order.empty_desc")}
							action={
								<Button
									onClick={() => navigate({ to: "/purchase-orders/new" })}
								>
									{t("purchase_order.add_new")}
								</Button>
							}
						/>
					</div>
				) : (
					<div className="flex flex-col h-full space-y-6">
						<div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
							<Table
								headers={[
									<div
										key="po"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("purchase_order.po_number")}
									</div>,
									<div
										key="supplier"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("purchase_order.supplier")}
									</div>,
									<div
										key="arrival"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("purchase_order.est_arrival")}
									</div>,
									<div
										key="total"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("purchase_order.total")}
									</div>,
									<div
										key="status"
										className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
									>
										{t("purchase_order.status")}
									</div>,
								]}
								flat
							>
								{paginatedItems.map((po) => (
									<TableRow
										key={po.id}
										className="group cursor-pointer hover:bg-neutral-50/50 transition-colors"
										onClick={() =>
											navigate({ to: `/purchase-orders/${po.id}` })
										}
									>
										<TableCell>
											<div className="flex flex-col">
												<span className="text-[14px] font-bold text-neutral-900">
													PO-{po.id.slice(0, 8).toUpperCase()}
												</span>
												<span className="text-[12px] text-neutral-500">
													{formatDate(new Date(po.createdAt), language)}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Building className="w-4 h-4 text-neutral-400" />
												<span className="text-[14px] font-medium text-neutral-900">
													{
														po.supplierId /* We ideally want to join supplier name here, but id works for MVP */
													}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<span className="text-[13px] text-neutral-600">
												{po.expectedDate
													? formatDate(new Date(po.expectedDate), language)
													: "-"}
											</span>
										</TableCell>
										<TableCell>
											<span className="text-[14px] font-bold text-neutral-900">
												Rp {po.totalAmount.toLocaleString("id-ID")}
											</span>
										</TableCell>
										<TableCell>
											<StatusBadge
												type={
													po.status === "received"
														? "success"
														: po.status === "partial"
															? "info"
															: po.status === "cancelled"
																? "error"
																: "warning"
												}
												label={
													po.status === "received"
														? t("purchase_order.status_labels.completed")
														: po.status === "partial"
															? t(
																	"purchase_order.status_labels.partial_received",
																)
															: po.status === "cancelled"
																? t("purchase_order.status_labels.cancelled")
																: t(
																		"purchase_order.status_labels.draft_pending",
																	)
												}
											/>
										</TableCell>
									</TableRow>
								))}
							</Table>
						</div>

						<TablePagination {...pagination} />
					</div>
				)}
			</div>
		</div>
	);
}
