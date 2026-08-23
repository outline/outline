import type { TDocType } from "@/lib/form-builder/types";
import { i18n } from "@/shared/i18n/i18n.config";

export const AddBatchDocType: TDocType = {
	name: "AddBatch",
	module: "Inventory",
	fields: [
		{
			fieldname: "quantity",
			fieldtype: "number",
			label: i18n.t("inventory.add_batch_qty"),
			required: true,
			default_value: 1,
			min_value: 1,
		},
		{
			fieldname: "costPrice",
			fieldtype: "number",
			label: i18n.t("inventory.cost_price_label"),
			default_value: 0,
			min_value: 0,
			tooltip: i18n.t("inventory.cost_price_tooltip"),
		},
		{
			fieldname: "expiryDate",
			fieldtype: "date",
			label: i18n.t("inventory.expiry_date_label"),
		},
		{
			fieldname: "supplier",
			fieldtype: "text",
			label: i18n.t("inventory.supplier_label"),
		},
	],
};

export const AdjustStockDocType: TDocType = {
	name: "AdjustStock",
	module: "Inventory",
	fields: [
		{
			fieldname: "type",
			fieldtype: "select",
			label: i18n.t("inventory.adjust_type"),
			required: true,
			default_value: "ADJUST_LOSS",
			options: [
				{ value: "ADJUST_LOSS", label: i18n.t("inventory.adjust_loss") },
				{ value: "ADJUST_FOUND", label: i18n.t("inventory.adjust_found") },
				{ value: "OUT", label: i18n.t("inventory.adjust_manual_out") },
			],
		},
		{
			fieldname: "quantity",
			fieldtype: "number",
			label: i18n.t("common.quantity"),
			required: true,
			default_value: 1,
			min_value: 1,
		},
		{
			fieldname: "reason",
			fieldtype: "text",
			label: i18n.t("inventory.adjust_reason"),
			required: true,
			placeholder: i18n.t("inventory.adjust_reason_placeholder"),
		},
	],
};
