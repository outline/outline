/**
 * DocType Schema - Branch
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const BranchDocType: TDocType = {
	name: "Branch",
	module: "Branch",
	description: "Manages business branch locations",
	icon: "🏢",

	title_field: "name",
	search_fields: "name,address,phone,email,whatsapp_number",
	sort_field: "created_at",
	sort_order: "DESC",

	fields: [
		{
			fieldname: "section_info",
			fieldtype: "section_break",
			label: i18n.t("branch.info_section"),
		},
		{
			fieldname: "name",
			fieldtype: "text",
			label: i18n.t("branch.branch_name"),
			placeholder: i18n.t("branch.branch_name_placeholder"),
			required: true,
			max_length: 100,
			tooltip: i18n.t("branch.branch_name_tooltip"),
		},
		{
			fieldname: "address",
			fieldtype: "long_text",
			label: i18n.t("common.address"),
			placeholder: i18n.t("branch.address_placeholder"),
			max_length: 500,
		},
		{
			fieldname: "phone",
			fieldtype: "phone",
			label: i18n.t("common.phone"),
			placeholder: i18n.t("branch.phone_placeholder"),
			max_length: 20,
			tooltip: i18n.t("branch.phone_tooltip"),
		},
		{
			fieldname: "email",
			fieldtype: "text",
			label: i18n.t("branch.email"),
			placeholder: i18n.t("branch.email_placeholder"),
			max_length: 255,
		},
		{
			fieldname: "whatsapp_number",
			fieldtype: "phone",
			label: i18n.t("branch.whatsapp_number"),
			placeholder: i18n.t("branch.whatsapp_number_placeholder"),
			max_length: 20,
		},
		{
			fieldname: "section_address",
			fieldtype: "section_break",
			label: i18n.t("branch.address_section"),
		},
		{
			fieldname: "street_address",
			fieldtype: "long_text",
			label: i18n.t("branch.street_address"),
			max_length: 500,
		},
		{
			fieldname: "address_locality",
			fieldtype: "text",
			label: i18n.t("branch.address_locality"),
			max_length: 100,
		},
		{
			fieldname: "address_region",
			fieldtype: "text",
			label: i18n.t("branch.address_region"),
			max_length: 100,
		},
		{
			fieldname: "postal_code",
			fieldtype: "text",
			label: i18n.t("branch.postal_code"),
			max_length: 10,
		},
		{
			fieldname: "address_country",
			fieldtype: "text",
			label: i18n.t("branch.address_country"),
			max_length: 2,
		},
		{
			fieldname: "section_geo",
			fieldtype: "section_break",
			label: i18n.t("branch.geo_section"),
		},
		{
			fieldname: "latitude",
			fieldtype: "number",
			label: i18n.t("branch.latitude"),
			tooltip: i18n.t("branch.geo_tooltip"),
		},
		{
			fieldname: "longitude",
			fieldtype: "number",
			label: i18n.t("branch.longitude"),
		},
	],

	permissions: [
		{
			role: "admin",
			read: true,
			write: true,
			create: true,
			delete: true,
		},
		{
			role: "staff",
			read: true,
			write: false,
			create: false,
			delete: false,
		},
	],

	track_changes: true,
};
