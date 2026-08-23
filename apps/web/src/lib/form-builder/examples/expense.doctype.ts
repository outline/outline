import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const ExpenseDocType: TDocType = {
	name: "Expense",
	module: "Accounting",
	fields: [
		{
			fieldname: "expenseDate",
			label: i18n.t("accounting.expense_date"),
			fieldtype: "date",
			required: true,
			default_value: new Date().toISOString().split("T")[0],
		},
		{
			fieldname: "category",
			label: i18n.t("accounting.category"),
			fieldtype: "select",
			required: true,
			options: [
				{
					label: i18n.t("accounting.expense_categories.operasional"),
					value: "operasional",
				},
				{
					label: i18n.t("accounting.expense_categories.gaji"),
					value: "gaji",
				},
				{
					label: i18n.t("accounting.expense_categories.stok"),
					value: "stok",
				},
				{
					label: i18n.t("accounting.expense_categories.marketing"),
					value: "marketing",
				},
				{
					label: i18n.t("accounting.expense_categories.pajak"),
					value: "pajak",
				},
				{
					label: i18n.t("accounting.expense_categories.lainnya"),
					value: "lainnya",
				},
			],
		},
		{
			fieldname: "description",
			label: i18n.t("common.description"),
			fieldtype: "text",
			required: true,
			placeholder: i18n.t("accounting.expense_desc_placeholder"),
		},
		{
			fieldname: "amount",
			label: i18n.t("common.amount"),
			fieldtype: "currency",
			required: true,
			default_value: 0,
		},
		{
			fieldname: "paymentMethod",
			label: i18n.t("accounting.payment_method"),
			fieldtype: "select",
			required: true,
			options: [
				{
					label: i18n.t("accounting.payment_methods.cash"),
					value: "cash",
				},
				{
					label: i18n.t("accounting.payment_methods.transfer"),
					value: "transfer",
				},
				{
					label: i18n.t("accounting.payment_methods.card"),
					value: "card",
				},
				{
					label: i18n.t("accounting.payment_methods.ewallet"),
					value: "ewallet",
				},
			],
		},
		{
			fieldname: "branchId",
			label: i18n.t("boarding_form.labels.branch"),
			fieldtype: "select",
			required: false,
			// Options will be populated dynamically from branches
			options: [],
		},
		{
			fieldname: "notes",
			label: i18n.t("accounting.additional_notes"),
			fieldtype: "long_text",
			required: false,
			placeholder: i18n.t("common.optional"),
		},
		{
			fieldname: "receiptUrl",
			label: i18n.t("accounting.receipt_label", "Struk / Bukti Pembayaran"),
			fieldtype: "image",
		},
	],
};
