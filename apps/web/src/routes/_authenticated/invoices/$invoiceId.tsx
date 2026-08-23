import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Skeleton,
	toast,
} from "@/components/ui";
import {
	getSessionInfo,
	hasRequiredRole,
} from "@/domain/identity/auth/auth.functions";
import { getInvoiceById, payInvoice } from "@/lib/api/invoice.functions";
import { FormBuilder } from "@/lib/form-builder";
import { invalidateInvoices } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";
import { formatCurrency, formatDate } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import { Badge, EmptyState, PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/invoices/$invoiceId")({
	beforeLoad: async () => {
		const session = await getSessionInfo();
		if (!session || !hasRequiredRole(session.role, "manager")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: InvoiceDetailPage,
});

const getPaymentDocType = (t: (key: string, fallback?: string) => string) => ({
	name: "Payment",
	title: t("invoice.record_payment"),
	fields: [
		{
			fieldname: "amount",
			label: t("invoice.payment_amount"),
			fieldtype: "currency",
			required: true,
		},
		{
			fieldname: "paymentDate",
			label: t("invoice.payment_date"),
			fieldtype: "date",
			required: true,
			default: "today",
		},
		{
			fieldname: "method",
			label: t("accounting.payment_method"),
			fieldtype: "select",
			required: true,
			options: [
				t("accounting.payment_methods.transfer"),
				t("accounting.payment_methods.cash"),
				"QRIS",
				t("accounting.payment_methods.card"),
			],
		},
		{
			fieldname: "reference",
			label: t("common.reference_optional", "Nomor Referensi (Opsional)"),
			fieldtype: "text",
		},
	],
});

function InvoiceDetailPage() {
	const { t, i18n } = useTranslation();
	const { invoiceId } = Route.useParams();
	const queryClient = useQueryClient();

	const { data: invoice, isLoading } = useQuery({
		queryKey: queryKeys.invoices.detail(invoiceId),
		queryFn: () => getInvoiceById({ data: invoiceId }),
	});

	const payMutation = useMutation({
		mutationFn: (values: Record<string, unknown>) =>
			payInvoice({ data: { invoiceId, payment: values } }),
		onSuccess: () => {
			toast.success(t("invoice.payment_recorded"));
			invalidateInvoices(queryClient, invoiceId);
		},
		onError: (error) => {
			toast.error(t("invoice.payment_record_failed"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	if (isLoading) {
		return (
			<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
				<PageHeader title={t("invoice.loading_invoice_detail")} />
				<div className="p-6 lg:p-8 flex-1 bg-white space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className="h-24 rounded-xl" />
						))}
					</div>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<Skeleton className="h-80 rounded-xl col-span-2" />
						<Skeleton className="h-80 rounded-xl" />
					</div>
				</div>
			</div>
		);
	}

	if (!invoice) {
		return (
			<div className="p-8">
				<EmptyState
					title={t("invoice.invoice_not_found")}
					description={t("invoice.invoice_not_found_desc")}
				/>
			</div>
		);
	}

	const remainingAmount = invoice.totalAmount - invoice.amountPaid;
	const paymentDocType = getPaymentDocType(
		t as (key: string, fallback?: string) => string,
	);

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={`Invoice ${invoice.invoiceNumber}`}
				description={`${t("nav.parent_customers")}: ${invoice.customerName}`}
				breadcrumbs={[
					{ label: t("nav.invoices"), href: "/invoices" },
					{ label: invoice.invoiceNumber },
				]}
				actions={
					<div className="flex gap-2">
						<Button variant="outline">{t("invoice.print_pdf")}</Button>
						{invoice.status !== "paid" && invoice.status !== "void" && (
							<Dialog>
								<DialogTrigger asChild>
									<Button className="bg-neutral-900 text-white hover:bg-neutral-800">
										{t("invoice.record_payment")}
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>
											{t("invoice.record_payment_invoice")}
										</DialogTitle>
									</DialogHeader>
									<div className="mt-4">
										<FormBuilder
											doctype={{
												...paymentDocType,
												fields: paymentDocType.fields.map((f) =>
													f.fieldname === "amount"
														? { ...f, default: remainingAmount }
														: f,
												) as import("@/lib/form-builder/types").TFieldSchema[],
											}}
											mode="create"
											onSubmit={async (values) => {
												await payMutation.mutateAsync(values);
												return { message: t("common.success") };
											}}
										/>
									</div>
								</DialogContent>
							</Dialog>
						)}
					</div>
				}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white space-y-6">
				{/* Top Summary Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="p-4 border rounded-xl bg-neutral-50">
						<p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
							{t("common.status")}
						</p>
						<div className="mt-1">
							<Badge
								variant={
									invoice.status === "paid"
										? "success"
										: invoice.status === "partial"
											? "warning"
											: "error"
								}
							>
								{invoice.status.toUpperCase()}
							</Badge>
						</div>
					</div>
					<div className="p-4 border rounded-xl bg-neutral-50">
						<p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
							{t("invoice.due_date")}
						</p>
						<p className="text-sm font-bold mt-1 text-neutral-900">
							{formatDate(
								new Date(invoice.dueDate),
								i18n.language as "id" | "en",
							)}
						</p>
					</div>
					<div className="p-4 border rounded-xl bg-neutral-50">
						<p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">
							{t("invoice.total_invoice")}
						</p>
						<p className="text-lg font-bold mt-1 text-neutral-900">
							{formatCurrency(
								invoice.totalAmount,
								i18n.language as "id" | "en",
							)}
						</p>
					</div>
					<div className="p-4 border rounded-xl bg-rose-50 border-rose-100">
						<p className="text-xs text-rose-500 uppercase font-bold tracking-wider">
							{t("invoice.remaining_invoice")}
						</p>
						<p className="text-lg font-bold mt-1 text-rose-700">
							{formatCurrency(remainingAmount, i18n.language as "id" | "en")}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="col-span-2 space-y-6">
						<div className="border rounded-xl p-6">
							<h3 className="font-bold mb-4">{t("invoice.item_details")}</h3>
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left text-neutral-500">
										<th className="pb-2 font-bold uppercase text-[10px] tracking-wider">
											{t("invoice.item_label")}
										</th>
										<th className="pb-2 font-bold uppercase text-[10px] tracking-wider text-right">
											{t("common.quantity_short", "Qty")}
										</th>
										<th className="pb-2 font-bold uppercase text-[10px] tracking-wider text-right">
											{t("invoice.unit_price_label")}
										</th>
										<th className="pb-2 font-bold uppercase text-[10px] tracking-wider text-right">
											Total
										</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{invoice.items?.map((item) => (
										<tr key={item.id}>
											<td className="py-3 font-medium">{item.itemName}</td>
											<td className="py-3 text-right">{item.quantity}</td>
											<td className="py-3 text-right">
												{formatCurrency(
													item.unitPrice,
													i18n.language as "id" | "en",
												)}
											</td>
											<td className="py-3 text-right font-bold">
												{formatCurrency(
													item.total,
													i18n.language as "id" | "en",
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<div className="border-t pt-4 mt-4 flex justify-end">
								<div className="w-64 space-y-2">
									<div className="flex justify-between text-sm">
										<span className="text-neutral-500">Subtotal</span>
										<span className="font-medium">
											{formatCurrency(
												invoice.subtotal,
												i18n.language as "id" | "en",
											)}
										</span>
									</div>
									<div className="flex justify-between text-sm font-bold pt-2 border-t">
										<span>Total</span>
										<span>
											{formatCurrency(
												invoice.totalAmount,
												i18n.language as "id" | "en",
											)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-6">
						<div className="border rounded-xl p-6 bg-neutral-50">
							<h3 className="font-bold mb-4">{t("invoice.payment_history")}</h3>
							{invoice.payments && invoice.payments.length > 0 ? (
								<div className="space-y-4">
									{invoice.payments.map((payment) => (
										<div
											key={payment.id}
											className="p-3 bg-white border rounded-lg"
										>
											<div className="flex justify-between items-start">
												<div>
													<p className="font-bold text-sm">
														{formatCurrency(
															payment.amount,
															i18n.language as "id" | "en",
														)}
													</p>
													<p className="text-xs text-neutral-500">
														{payment.method}
													</p>
												</div>
												<div className="text-right">
													<p className="text-xs text-neutral-500">
														{formatDate(
															new Date(payment.paymentDate),
															i18n.language as "id" | "en",
														)}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-neutral-500 text-center py-4">
									{t("invoice.no_payments")}
								</p>
							)}
						</div>

						{(invoice.notes || invoice.terms) && (
							<div className="border rounded-xl p-6">
								<h3 className="font-bold mb-2">{t("common.notes")}</h3>
								<p className="text-sm text-neutral-600 whitespace-pre-wrap">
									{invoice.notes}
								</p>

								<h3 className="font-bold mt-4 mb-2">{t("terms_page.title")}</h3>
								<p className="text-sm text-neutral-600 whitespace-pre-wrap">
									{invoice.terms}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
