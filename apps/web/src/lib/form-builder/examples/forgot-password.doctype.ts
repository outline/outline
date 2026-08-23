/**
 * DocType Schema - Forgot Password
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const ForgotPasswordDocType: TDocType = {
	name: "ForgotPassword",
	module: "Identity",
	description: "Form lupa kata sandi",
	icon: "🔑",

	fields: [
		{
			fieldname: "email",
			fieldtype: "text",
			label: i18n.t("contact.email_label"),
			placeholder: "halo@petstoresaas.com",
			required: true,
			max_length: 255,
			tooltip: i18n.t("forgot_password.email_tooltip"),
		},
	],
};
