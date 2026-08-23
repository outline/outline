/**
 * DocType Schema - Reset Password
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const ResetPasswordDocType: TDocType = {
	name: "ResetPassword",
	module: "Identity",
	description: "Form atur ulang kata sandi",
	icon: "🔒",

	fields: [
		{
			fieldname: "password",
			fieldtype: "password",
			label: i18n.t("reset_password.new_password"),
			placeholder: i18n.t("reset_password.min_chars"),
			required: true,
			max_length: 72,
			min_length: 6,
			tooltip: i18n.t("reset_password.password_tooltip"),
		},
		{
			fieldname: "confirm_password",
			fieldtype: "password",
			label: i18n.t("reset_password.confirm_new_password"),
			placeholder: i18n.t("reset_password.repeat_password"),
			required: true,
			max_length: 72,
		},
	],
};
