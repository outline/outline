import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InvoiceDocType } from "@/domain/invoice/invoice.doctype";
import { createInvoice } from "@/lib/api/invoice.functions";
import { FormBuilder } from "@/lib/form-builder";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/invoices/new")({
	component: NewInvoicePage,
});

function NewInvoicePage() {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title="Buat Invoice Baru"
				description="Buat tagihan baru untuk pelanggan"
				breadcrumbs={[
					{ label: "Invoices", href: "/invoices" },
					{ label: "Buat Baru" },
				]}
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-4xl">
					<FormBuilder
						doctype={InvoiceDocType}
						mode="create"
						onSubmit={async (values) => {
							// Calculate totals
							let subtotal = 0;
							let discountAmount = 0;
							const taxAmount = 0;

							const items =
								(values.items as Record<string, unknown>[])?.map((item) => {
									const quantity = Number(item.quantity) || 0;
									const unitPrice = Number(item.unitPrice) || 0;
									const discount = Number(item.discount) || 0;
									const itemTotal = quantity * unitPrice - discount;
									subtotal += quantity * unitPrice;
									discountAmount += discount;
									return {
										...item,
										total: itemTotal,
									};
								}) || [];

							const totalAmount = subtotal - discountAmount + taxAmount;

							await createInvoice({
								data: {
									customerId: values.customerId as string,
									issueDate: values.issueDate as string,
									dueDate: values.dueDate as string,
									subtotal,
									discountAmount,
									taxAmount,
									totalAmount,
									notes: (values.notes as string) || undefined,
									terms: (values.terms as string) || undefined,
									items,
								},
							});

							navigate({ to: "/invoices" });
							return { message: "Invoice berhasil dibuat" };
						}}
					/>
				</div>
			</div>
		</div>
	);
}
