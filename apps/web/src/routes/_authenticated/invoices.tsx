import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	FileTextLinear as InvoiceIcon,
	AddCircleLinear as PlusIcon,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import { getInvoices } from "@/lib/api/invoice.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { formatCurrency, formatDate } from "@/shared/utils";
import {
	EmptyState,
	PageHeader,
	StatusBadge,
	Table,
	TableCell,
	TableRow,
} from "@/ui";

export const Route = createFileRoute("/_authenticated/invoices")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: InvoicesPage,
});

function InvoicesPage() {
	const { t, i18n } = useTranslation();
	const [activeTab, setActiveTab] = useState<
		"all" | "unpaid" | "partial" | "paid"
	>("all");

	const { data: invoices, isLoading } = useQuery({
		queryKey: [...queryKeys.invoices.list(), activeTab],
		queryFn: () => getInvoices({ data: activeTab }),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

	const getStatusColor = (status: string) => {
		switch (status) {
			case "paid":
				return "success";
			case "partial":
				return "warning";
			case "unpaid":
				return "danger";
			case "draft":
				return "neutral";
			case "void":
				return "neutral";
			default:
				return "neutral";
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case "paid":
				return t("billing.paid");
			case "partial":
				return t("pos.partial_label", "Partial");
			case "unpaid":
				return t("billing.unpaid");
			case "draft":
				return t("common.draft");
			case "void":
				return t("common.void");
			default:
				return status;
		}
	};

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title="Invoices"
				description={t("invoice.invoice_list_desc")}
				actions={
					<Button
						asChild
						className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800"
					>
						<Link to="/invoices/new">
							<PlusIcon className="w-5 h-5" />
							{t("invoice.create_new_invoice")}
						</Link>
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="flex space-x-1 border-b border-neutral-200 mb-6">
					{[
						{ id: "all", label: t("common.all") },
						{ id: "unpaid", label: t("billing.unpaid") },
						{ id: "partial", label: t("pos.partial_label", "Partial") },
						{ id: "paid", label: t("billing.paid") },
					].map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() =>
								setActiveTab(tab.id as "all" | "unpaid" | "partial" | "paid")
							}
							className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
								activeTab === tab.id
									? "border-neutral-900 text-neutral-900"
									: "border-transparent text-neutral-500 hover:text-neutral-700"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				<div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
					<Table
						headers={[
							<div
								key="invoice"
								className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider pl-2"
							>
								{t("invoice.invoice_number")}
							</div>,
							<div
								key="customer"
								className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
							>
								{t("customers.title")}
							</div>,
							<div
								key="date"
								className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
							>
								{t("common.date")}
							</div>,
							<div
								key="due"
								className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
							>
								{t("invoice.due_date")}
							</div>,
							<div
								key="total"
								className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right"
							>
								{t("invoice.total_invoice")}
							</div>,
							<div
								key="rem"
								className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider text-right"
							>
								{t("invoice.remaining_invoice")}
							</div>,
							<div
								key="status"
								className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
							>
								{t("common.status")}
							</div>,
							<div key="action"></div>,
						]}
						flat
					>
						{isLoading ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="h-32 text-center text-neutral-500"
								>
									{t("common.loading")}
								</TableCell>
							</TableRow>
						) : !invoices || invoices.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} className="p-0 border-none">
									<EmptyState
										icon={InvoiceIcon}
										title={t("invoice.no_invoice_title")}
										description={t("invoice.no_invoice_desc")}
										className="border-none bg-transparent py-12"
									/>
								</TableCell>
							</TableRow>
						) : (
							invoices.map((inv) => (
								<TableRow key={inv.id}>
									<TableCell className="font-bold text-neutral-900 pl-4">
										{inv.invoiceNumber}
									</TableCell>
									<TableCell>{inv.customerName || "-"}</TableCell>
									<TableCell>
										{formatDate(
											new Date(inv.issueDate),
											i18n.language as "id" | "en",
										)}
									</TableCell>
									<TableCell>
										{formatDate(
											new Date(inv.dueDate),
											i18n.language as "id" | "en",
										)}
									</TableCell>
									<TableCell align="right" className="font-bold text-[14px]">
										{formatCurrency(
											inv.totalAmount,
											i18n.language as "id" | "en",
										)}
									</TableCell>
									<TableCell
										align="right"
										className="font-medium text-[13px] text-rose-600"
									>
										{formatCurrency(
											inv.totalAmount - inv.amountPaid,
											i18n.language as "id" | "en",
										)}
									</TableCell>
									<TableCell>
										<StatusBadge
											type={
												getStatusColor(
													inv.status,
												) as import("@/ui/status/status-badge").TStatusType
											}
											label={getStatusLabel(inv.status)}
										/>
									</TableCell>
									<TableCell align="right" className="pr-4">
										<Button asChild variant="outline" size="sm">
											<Link
												to="/invoices/$invoiceId"
												params={{ invoiceId: inv.id }}
											>
												{t("common.detail")}
											</Link>
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</Table>
				</div>
			</div>
		</div>
	);
}
