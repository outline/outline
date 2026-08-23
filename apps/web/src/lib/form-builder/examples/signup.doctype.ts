/**
 * DocType Schema - Signup
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const SignupDocType: TDocType = {
	name: "Signup",
	module: "Identity",
	description: i18n.t("signup_doctype.description"),
	icon: "📝",

	fields: [
		{
			fieldname: "section_info",
			fieldtype: "section_break",
			label: i18n.t("signup_doctype.section_account"),
		},
		{
			fieldname: "full_name",
			fieldtype: "text",
			label: i18n.t("signup_doctype.full_name_label"),
			placeholder: i18n.t("signup_doctype.full_name_placeholder"),
			required: true,
			max_length: 100,
		},
		{
			fieldname: "business_name",
			fieldtype: "text",
			label: i18n.t("signup_doctype.business_name_label"),
			placeholder: i18n.t("signup_doctype.business_name_placeholder"),
			required: true,
			max_length: 100,
			default_value: i18n.t("signup_doctype.business_name_default"),
		},
		{
			fieldname: "email",
			fieldtype: "text",
			label: i18n.t("signup_doctype.email_label"),
			placeholder: i18n.t("signup_doctype.email_placeholder"),
			required: true,
			max_length: 255,
		},
		{
			fieldname: "password",
			fieldtype: "password",
			label: i18n.t("signup_doctype.password_label"),
			placeholder: i18n.t("signup_doctype.password_placeholder"),
			required: true,
			max_length: 72,
			min_length: 6,
			tooltip: i18n.t("signup_doctype.password_tooltip"),
		},
	],
};
