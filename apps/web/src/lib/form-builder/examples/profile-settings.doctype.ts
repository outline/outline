/**
 * DocType Schema - Profile Settings
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const ProfileSettingsDocType: TDocType = {
	name: "ProfileSettings",
	module: "Identity",
	description: "Pengaturan profil pengguna",
	icon: "👤",

	fields: [
		{
			fieldname: "full_name",
			fieldtype: "text",
			label: i18n.t("profile.full_name_label"),
			placeholder: i18n.t("profile.full_name_placeholder"),
			required: true,
			max_length: 100,
		},
		{
			fieldname: "phone_number",
			fieldtype: "phone",
			label: i18n.t("common.phone"),
			placeholder: i18n.t("profile.phone_placeholder"),
			required: false,
			max_length: 20,
		},
		{
			fieldname: "email",
			fieldtype: "text",
			label: i18n.t("contact.email_label"),
			placeholder: i18n.t("profile.email_placeholder"),
			required: false,
		},
	],
};

export const PasswordSettingsDocType: TDocType = {
	name: "PasswordSettings",
	module: "Identity",
	description: "Pengaturan keamanan akun",
	icon: "🔒",

	fields: [
		{
			fieldname: "currentPassword",
			fieldtype: "password",
			label: i18n.t("profile.current_password_label"),
			placeholder: i18n.t("profile.current_password_placeholder"),
			required: true,
			min_length: 8,
		},
		{
			fieldname: "password",
			fieldtype: "password",
			label: i18n.t("profile.new_password_label"),
			placeholder: i18n.t("profile.new_password_placeholder"),
			required: true,
			min_length: 8,
			max_length: 72,
		},
	],
};

export const PinSettingsDocType: TDocType = {
	name: "PinSettings",
	module: "Identity",
	description: "Pengaturan PIN keamanan",
	icon: "🔢",

	fields: [
		{
			fieldname: "currentPassword",
			fieldtype: "password",
			label: i18n.t("profile.current_password_label"),
			placeholder: i18n.t("profile.current_password_placeholder"),
			required: true,
			min_length: 8,
		},
		{
			fieldname: "pin",
			fieldtype: "password",
			label: i18n.t("profile.pin_label"),
			placeholder: i18n.t("profile.pin_placeholder"),
			required: true,
			min_length: 6,
			max_length: 6,
		},
	],
};
