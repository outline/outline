import { z } from "zod";

export const invoiceItemSchema = z.object({
	id: z.string().optional(), // For new items, this is generated
	itemName: z.string().min(1, "Nama item wajib diisi"),
	quantity: z.number().min(0.01, "Kuantitas minimal 0.01"),
	unitPrice: z.number().min(0, "Harga satuan minimal 0"),
	discount: z.number().min(0).default(0),
});

export const createInvoiceSchema = z.object({
	customerId: z.string().min(1, "Pelanggan wajib dipilih"),
	issueDate: z.string(),
	dueDate: z.string(),
	notes: z.string().optional(),
	terms: z.string().optional(),
	items: z.array(invoiceItemSchema).min(1, "Minimal 1 item"),
});

export const recordPaymentSchema = z.object({
	amount: z.number().min(1, "Nominal pembayaran minimal 1"),
	paymentDate: z.string(),
	method: z.string().min(1, "Metode pembayaran wajib dipilih"),
	reference: z.string().optional(),
});
