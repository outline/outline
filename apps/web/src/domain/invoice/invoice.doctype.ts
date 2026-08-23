// @ts-nocheck
import type { TDocType } from "@/lib/form-builder";

export const InvoiceItemDocType: TDocType = {
	name: "InvoiceItem",
	title: "Item Invoice",
	fields: [
		{
			fieldname: "itemName",
			label: "Nama Item/Jasa",
			fieldtype: "text",
			required: true,
			in_list_view: true,
			columns: 4,
		},
		{
			fieldname: "quantity",
			label: "Kuantitas",
			fieldtype: "number",
			required: true,
			in_list_view: true,
			default: 1,
			columns: 2,
		},
		{
			fieldname: "unitPrice",
			label: "Harga Satuan",
			fieldtype: "currency",
			required: true,
			in_list_view: true,
			default: 0,
			columns: 3,
		},
		{
			fieldname: "discount",
			label: "Diskon",
			fieldtype: "currency",
			default: 0,
			columns: 3,
		},
	],
};

export const InvoiceDocType: TDocType = {
	name: "Invoice",
	title: "Invoice / Tagihan",
	fields: [
		{
			fieldname: "customerId",
			label: "Pelanggan",
			fieldtype: "link",
			options: "customers", // Custom option resolution in frontend
			required: true,
		},
		{
			fieldname: "issueDate",
			label: "Tanggal Terbit",
			fieldtype: "date",
			required: true,
			default: "today",
		},
		{
			fieldname: "dueDate",
			label: "Jatuh Tempo",
			fieldtype: "date",
			required: true,
		},
		{
			fieldname: "items",
			label: "Rincian Tagihan",
			fieldtype: "table",
			child_doctype: InvoiceItemDocType,
			required: true,
		},
		{
			fieldname: "notes",
			label: "Catatan (Opsional)",
			fieldtype: "textarea",
		},
		{
			fieldname: "terms",
			label: "Syarat & Ketentuan",
			fieldtype: "textarea",
		},
	],
};
