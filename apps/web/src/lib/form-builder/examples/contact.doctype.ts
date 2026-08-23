/**
 * DocType Schema - Contact
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const ContactDocType: TDocType = {
	name: "Contact",
	module: "Communication",
	description: "Form kontak untuk pertanyaan dan dukungan",
	icon: "✉️",

	fields: [
		{
			fieldname: "section_info",
			fieldtype: "section_break",
			label: i18n.t("contact.info_section"),
		},
		{
			fieldname: "first_name",
			fieldtype: "text",
			label: i18n.t("contact.first_name"),
			placeholder: "John",
			required: true,
			max_length: 100,
		},
		{
			fieldname: "last_name",
			fieldtype: "text",
			label: i18n.t("contact.last_name"),
			placeholder: "Doe",
			required: true,
			max_length: 100,
		},
		{
			fieldname: "email",
			fieldtype: "text",
			label: i18n.t("contact.email_label"),
			placeholder: "john@petstore.com",
			required: true,
			max_length: 255,
		},
		{
			fieldname: "section_message",
			fieldtype: "section_break",
			label: i18n.t("contact.message_section"),
		},
		{
			fieldname: "message",
			fieldtype: "long_text",
			label: i18n.t("contact.message_label"),
			placeholder: i18n.t("contact.message_placeholder"),
			required: true,
			max_length: 1000,
		},
	],
};
