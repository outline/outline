/**
 * DocType Schema - Login
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const LoginDocType: TDocType = {
	name: "Login",
	module: "Identity",
	description: i18n.t("login_doctype.description"),
	icon: "🔐",

	fields: [
		{
			fieldname: "email",
			fieldtype: "text",
			label: i18n.t("login_doctype.email_label"),
			placeholder: i18n.t("login_doctype.email_placeholder"),
			required: true,
			max_length: 255,
		},
		{
			fieldname: "password",
			fieldtype: "password",
			label: i18n.t("login_doctype.password_label"),
			placeholder: i18n.t("login_doctype.password_placeholder"),
			required: true,
			max_length: 72,
		},
	],
};
