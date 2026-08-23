/**
 * DocType Schema - Business Settings
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const BusinessSettingsDocType: TDocType = {
	name: "BusinessSettings",
	module: "Identity",
	description: "Pengaturan informasi bisnis",
	icon: "🏢",

	fields: [
		{
			fieldname: "name",
			fieldtype: "text",
			label: i18n.t("business.name"),
			placeholder: i18n.t("business.name_placeholder"),
			required: true,
			max_length: 100,
			tooltip: i18n.t("business.name_tooltip"),
		},
		{
			fieldname: "phone",
			fieldtype: "phone",
			label: i18n.t("common.phone"),
			placeholder: "081234567890",
			required: false,
		},
		{
			fieldname: "address",
			fieldtype: "long_text",
			label: i18n.t("common.address"),
			placeholder: i18n.t("business.address_placeholder"),
			required: false,
		},
	],
};
