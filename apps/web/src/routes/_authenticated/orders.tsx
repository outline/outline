import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
	CalendarLinear as CalendarIcon,
	ChartBoldDuotone as ChartIcon,
	BillListBoldDuotone as ReceiptIcon,
	MagniferLinear as SearchIcon,
	WalletMoneyBoldDuotone as WalletIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderReturnModal, OrderVoidModal } from "@/domain/order";
import { ordersApi } from "@/lib/api/orders.functions";
import { createReturn } from "@/lib/api/return.functions";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { generatePDFReport } from "@/lib/report.functions";
import { useLanguage } from "@/shared/i18n";
import { i18n } from "@/shared/i18n/i18n.config";
import { cn, formatCurrency, formatDate, formatNumber } from "@/shared/utils";
import {
	Button,
	DashboardCard,
	DashboardMetric,
	DashboardMetricGroup,
	EmptyState,
	PageHeader,
} from "@/ui";

export const Route = createFileRoute("/_authenticated/orders")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("order.history_title")} — ${APP_CONFIG.name}` },
			{ name: "description", content: i18n.t("order.history_desc") },
		],
	}),
	component: OrdersPage,
});

import { useTranslation } from "react-i18next";
import type { TOrderDto } from "@/domain/order/order.dto";
import { OrderStatusBadge, OrderStatusDialog } from "@/domain/order";
import { updateOrderStatus } from "@/lib/api/orders.functions";
import { STATUS_LABELS, type TOrderStatus } from "@/domain/order/order.types";
import { extractErrorMessage } from "@/shared/utils/error";

function OrdersPage() {
	const { t } = useTranslation();
	const { language } = useLanguage();

	const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
		cash: {
			label: t("order.payment_labels.cash"),
			color: "bg-emerald-100 text-emerald-700",
		},
		transfer: {
			label: t("order.payment_labels.transfer"),
			color: "bg-blue-100 text-blue-700",
		},
		qris: {
			label: t("order.payment_labels.qris"),
			color: "bg-purple-100 text-purple-700",
		},
		card: {
			label: t("order.payment_labels.card"),
			color: "bg-amber-100 text-amber-700",
		},
	};

	const [orders, setOrders] = useState<readonly TOrderDto[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [dateFilter, setDateFilter] = useState<
		"all" | "today" | "week" | "month"
	>("all");
	const [selectedOrder, setSelectedOrder] = useState<TOrderDto | null>(null);
	const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
	const [processingReturn, setProcessingReturn] = useState(false);
	const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
	const [voidOrderId, setVoidOrderId] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [orderForStatusUpdate, setOrderForStatusUpdate] =
		useState<TOrderDto | null>(null);

	const loadOrders = useCallback(async () => {
		try {
			setLoading(true);
			const data = await ordersApi.getOrders();
			setOrders(data);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : t("order.load_orders_failed");
			toast.error(i18n.t("order.load_orders_failed"), { description: message });
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		loadOrders();
	}, [loadOrders]);

	const handleProcessReturn = async (payload: Record<string, unknown>) => {
		try {
			setProcessingReturn(true);
			await createReturn({ data: payload });
			toast.success(i18n.t("common.success_title"), {
				description: i18n.t("toast.return_processed"),
			});
			setIsReturnModalOpen(false);
			loadOrders(); // refresh
		} catch (error) {
			toast.error(i18n.t("toast.return_process_failed"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		} finally {
			setProcessingReturn(false);
		}
	};

	const filterByDate = (order: TOrderDto) => {
		const orderDate = new Date(order.createdAt);
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
		const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

		switch (dateFilter) {
			case "today":
				return orderDate >= today;
			case "week":
				return orderDate >= weekAgo;
			case "month":
				return orderDate >= monthAgo;
			default:
				return true;
		}
	};

	const filteredOrders = orders.filter((order) => {
		const matchesSearch =
			searchQuery === "" ||
			order.items.some((item) =>
				item.productName?.toLowerCase().includes(searchQuery.toLowerCase()),
			) ||
			order.id.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus =
			statusFilter === "all" || order.status === statusFilter;

		return matchesSearch && filterByDate(order) && matchesStatus;
	});

	const totalRevenue = filteredOrders.reduce(
		(sum, order) => sum + order.totalAmount,
		0,
	);
	const totalTransactions = filteredOrders.length;

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			{/* Header */}
			<PageHeader
				title={i18n.t("order.history_title")}
				description={t("order.subtitle")}
				docHref="/docs/pos"
				onExport={() =>
					exportToCSV(
						orders as unknown as Record<string, unknown>[],
						"transaction-history.csv",
					)
				}
				onReport={() => {
					const totalRevenue = orders.reduce(
						(acc, o) => acc + o.totalAmount,
						0,
					);
					const cash = orders.filter((o) => o.paymentMethod === "cash").length;
					const transfer = orders.filter(
						(o) => o.paymentMethod === "transfer",
					).length;
					const qris = orders.filter((o) => o.paymentMethod === "qris").length;

					generatePDFReport({
						title: t("order.report_title"),
						businessName: APP_CONFIG.name,
						date: formatDate(new Date(), "id"),
						sections: [
							{
								title: t("order.financial_summary"),
								items: [
									{
										label: t("order.total_transactions"),
										value: orders.length,
									},
									{
										label: t("order.total_revenue"),
										value: formatCurrency(totalRevenue, "id"),
									},
								],
							},
							{
								title: t("order.payment_methods"),
								items: [
									{ label: t("order.payment_labels.cash"), value: cash },
									{
										label: t("order.payment_labels.transfer"),
										value: transfer,
									},
									{ label: t("order.payment_labels.qris"), value: qris },
								],
							},
						],
					});
				}}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-6">
					{loading ? (
						<div className="space-y-4">
							<Skeleton className="h-8 w-48 rounded" />
							<Skeleton className="h-12 w-full rounded" />
							<div className="space-y-3">
								{[1, 2, 3, 4, 5].map((i) => (
									<Skeleton key={i} className="h-20 rounded" />
								))}
							</div>
						</div>
					) : (
						<>
							{/* Stats Cards */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<DashboardCard
									title={t("order.total_transactions")}
									icon={ReceiptIcon}
								>
									<DashboardMetricGroup>
										<DashboardMetric
											label={t("order.total_transactions")}
											value={formatNumber(totalTransactions, language)}
										/>
									</DashboardMetricGroup>
								</DashboardCard>
								<DashboardCard
									title={t("order.total_revenue")}
									icon={WalletIcon}
								>
									<DashboardMetricGroup>
										<DashboardMetric
											label={t("order.total_revenue")}
											value={formatCurrency(totalRevenue, language)}
											valueClassName="text-emerald-600"
										/>
									</DashboardMetricGroup>
								</DashboardCard>
								<DashboardCard
									title={t("order.average_per_transaction")}
									icon={ChartIcon}
								>
									<DashboardMetricGroup>
										<DashboardMetric
											label={t("order.average_per_transaction")}
											value={
												totalTransactions > 0
													? formatCurrency(
															Math.round(totalRevenue / totalTransactions),
															language,
														)
													: formatCurrency(0, language)
											}
										/>
									</DashboardMetricGroup>
								</DashboardCard>
							</div>

							{/* Filters */}
							<div className="flex flex-col sm:flex-row gap-4">
								<div className="relative flex-1">
									<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
									<Input
										type="text"
										placeholder={t("order.search_placeholder")}
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-10"
									/>
								</div>
								<div className="flex gap-2">
									{(["all", "today", "week", "month"] as const).map(
										(filter) => (
											<Button
												key={filter}
												size="sm"
												variant={dateFilter === filter ? "primary" : "outline"}
												onClick={() => setDateFilter(filter)}
											>
												{filter === "all"
													? i18n.t("common.all")
													: filter === "today"
														? t("order.today")
														: filter === "week"
															? t("order.7_days")
															: t("order.30_days")}
											</Button>
										),
									)}
								</div>
							</div>

							{/* Status Filter */}
							<div className="flex flex-wrap gap-2">
								{(
									[
										"all",
										"confirmed",
										"processing",
										"shipped",
										"delivered",
										"cancelled",
									] as const
								).map((status) => (
									<Button
										key={status}
										size="sm"
										variant={statusFilter === status ? "primary" : "outline"}
										onClick={() => setStatusFilter(status)}
									>
										{status === "all"
											? i18n.t("common.all")
											: STATUS_LABELS[status]}
									</Button>
								))}
							</div>

							{/* Orders List */}
							<div className="space-y-3">
								{filteredOrders.length === 0 ? (
									<EmptyState
										variant="orders"
										title={i18n.t("order.no_orders")}
										description={t("order.no_orders_desc")}
										className="bg-white border-dashed border-neutral-200"
									/>
								) : (
									filteredOrders.map((order) => {
										const paymentInfo =
											PAYMENT_LABELS[order.paymentMethod] ||
											PAYMENT_LABELS.cash;
										return (
											<div
												key={order.id}
												className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 transition-colors"
											>
												<div className="flex items-start justify-between mb-3">
													<div>
														<div className="flex items-center gap-2">
															<span className="text-sm font-mono text-neutral-400">
																#{order.id.slice(0, 8)}
															</span>
															<OrderStatusBadge
																status={order.status as TOrderStatus}
															/>
															<span
																className={cn(
																	"px-2 py-0.5 rounded-full text-xs font-medium",
																	paymentInfo?.color ||
																		"bg-neutral-100 text-neutral-700",
																)}
															>
																{paymentInfo?.label || order.paymentMethod}
															</span>
														</div>
														<div className="flex items-center gap-2 mt-1 text-sm text-neutral-500">
															<CalendarIcon className="w-3.5 h-3.5" />
															<span>
																{formatDate(order.createdAt, language, {
																	day: "2-digit",
																	month: "short",
																	year: "numeric",
																	hour: "2-digit",
																	minute: "2-digit",
																})}
															</span>
														</div>
													</div>
													<div className="text-right">
														<div className="text-lg font-bold text-emerald-600">
															{formatCurrency(order.totalAmount, language)}
														</div>
														<div className="flex items-center justify-end gap-2 mt-1">
															<div className="text-xs text-neutral-400">
																{t("order.item_count", {
																	count: order.items.length,
																})}
															</div>
															<Button
																variant="outline"
																size="sm"
																className="h-6 text-[10px] px-2 py-0 border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
																onClick={() => {
																	setOrderForStatusUpdate(order);
																	setIsStatusDialogOpen(true);
																}}
															>
																Status
															</Button>
															<Button
																variant="outline"
																size="sm"
																className="h-6 text-[10px] px-2 py-0 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
																onClick={() => {
																	setVoidOrderId(order.id);
																	setIsVoidModalOpen(true);
																}}
															>
																{t("order.void")}
															</Button>
															<Button
																variant="outline"
																size="sm"
																className="h-6 text-[10px] px-2 py-0 border-neutral-200 text-neutral-500 hover:text-neutral-900"
																onClick={() => {
																	setSelectedOrder(order);
																	setIsReturnModalOpen(true);
																}}
															>
																{t("order.return")}
															</Button>
														</div>
													</div>
												</div>

												<div className="border-t border-neutral-100 pt-3">
													<div className="flex flex-wrap gap-2">
														{order.items.map((item) => (
															<div
																key={item.id}
																className="flex items-center gap-2 bg-neutral-50 rounded-lg px-3 py-1.5"
															>
																<span className="text-sm text-neutral-700">
																	{item.productName || t("inventory.product")}
																</span>
																<span className="text-xs text-neutral-400">
																	x{item.quantity}
																</span>
																<span className="text-xs font-medium text-neutral-500">
																	{formatCurrency(
																		item.priceAtTime * item.quantity,
																		language,
																	)}
																</span>
															</div>
														))}
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						</>
					)}
				</div>
			</div>

			<OrderReturnModal
				isOpen={isReturnModalOpen}
				onClose={() => setIsReturnModalOpen(false)}
				order={
					selectedOrder as
						| import("@/domain/order/order.types").TOrderWithItems
						| null
				}
				onConfirm={handleProcessReturn}
				processing={processingReturn}
			/>

			{voidOrderId && (
				<OrderVoidModal
					isOpen={isVoidModalOpen}
					onClose={() => {
						setIsVoidModalOpen(false);
						setVoidOrderId(null);
					}}
					orderId={voidOrderId}
					onSuccess={() => {
						setIsVoidModalOpen(false);
						setVoidOrderId(null);
						loadOrders();
					}}
				/>
			)}

			{orderForStatusUpdate && (
				<OrderStatusDialog
					isOpen={isStatusDialogOpen}
					onClose={() => {
						setIsStatusDialogOpen(false);
						setOrderForStatusUpdate(null);
					}}
					order={{
						id: orderForStatusUpdate.id,
						status: orderForStatusUpdate.status,
					}}
					onUpdate={async (status, data) => {
						await updateOrderStatus({
							data: {
								orderId: orderForStatusUpdate.id,
								status,
								...(data.trackingNumber && {
									trackingNumber: data.trackingNumber,
								}),
								...(data.shippingCarrier && {
									shippingCarrier: data.shippingCarrier,
								}),
								...(data.cancelledReason && {
									cancelledReason: data.cancelledReason,
								}),
							},
						});
						loadOrders();
					}}
				/>
			)}
		</div>
	);
}
