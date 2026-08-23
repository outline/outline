import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const PettyCashDocType: TDocType = {
	name: "PettyCash",
	module: "Accounting",
	fields: [
		{
			fieldname: "transactionDate",
			label: i18n.t("accounting.trans_date"),
			fieldtype: "date",
			required: true,
			default_value: new Date().toISOString().split("T")[0],
		},
		{
			fieldname: "type",
			label: i18n.t("accounting.trans_type"),
			fieldtype: "select",
			required: true,
			options: [
				{ label: i18n.t("accounting.cash_in"), value: "in" },
				{ label: i18n.t("accounting.cash_out"), value: "out" },
			],
		},
		{
			fieldname: "description",
			label: i18n.t("common.description"),
			fieldtype: "text",
			required: true,
			placeholder: i18n.t("accounting.pettycash_placeholder"),
		},
		{
			fieldname: "amount",
			label: i18n.t("common.amount"),
			fieldtype: "currency",
			required: true,
			default_value: 0,
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
			fieldname: "receiptUrl",
			label: i18n.t("accounting.receipt_label", "Struk / Bukti Pembayaran"),
			fieldtype: "image",
		},
	],
};
