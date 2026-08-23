/**
 * DocType Schema - Invite Staff
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const InviteStaffDocType: TDocType = {
	name: "InviteStaff",
	module: "Staff",
	description: "Undang anggota tim baru",
	icon: "👤",

	fields: [
		{
			fieldname: "section_info",
			fieldtype: "section_break",
			label: i18n.t("staff.info_section"),
		},
		{
			fieldname: "email",
			fieldtype: "text",
			label: i18n.t("contact.email_label"),
			placeholder: "email@contoh.com",
			required: true,
			max_length: 255,
			tooltip: i18n.t("staff.email_tooltip"),
		},
		{
			fieldname: "branch_id",
			fieldtype: "link",
			label: i18n.t("staff.assign_branch"),
			required: true,
			placeholder: i18n.t("staff.select_branch"),
			link_doctype: "Branch",
			tooltip: i18n.t("staff.branch_tooltip"),
		},
		{
			fieldname: "role",
			fieldtype: "select",
			label: i18n.t("staff.access_role"),
			required: true,
			default_value: "staff_daycare",
			tooltip: i18n.t("staff.role_tooltip"),
			options: [
				{
					value: "owner",
					label: i18n.t("staff.roles.owner"),
					description: "Akses penuh ke semua fitur",
				},
				{
					value: "manager",
					label: i18n.t("staff.roles.manager"),
					description: "Kelola operasional dan laporan",
				},
				{
					value: "kasir",
					label: i18n.t("staff.roles.kasir"),
					description: "Akses POS dan transaksi",
				},
				{
					value: "staff_daycare",
					label: i18n.t("staff.roles.staff_daycare"),
					description: "Kelola boarding dan hewan",
				},
			],
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
			role: "manager",
			read: true,
			write: true,
			create: true,
			delete: false,
		},
	],
};
