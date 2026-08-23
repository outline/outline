/**
 * DocType Schema - Loyalty Configuration
 */

import { i18n } from "@/shared/i18n/i18n.config";
import type { TDocType } from "../types";

export const LoyaltyConfigDocType: TDocType = {
	name: "LoyaltyConfig",
	module: "Loyalty",
	description: "Konfigurasi sistem loyalitas pelanggan",
	icon: "⭐",

	fields: [
		{
			fieldname: "section_config",
			fieldtype: "section_break",
			label: i18n.t("loyalty.config_section"),
			description: i18n.t("loyalty.config_desc"),
		},
		{
			fieldname: "is_active",
			fieldtype: "check",
			label: i18n.t("loyalty.enable_loyalty"),
			default_value: true,
			tooltip: i18n.t("loyalty.enable_tooltip"),
		},
		{
			fieldname: "points_per_rupiah",
			fieldtype: "number",
			label: i18n.t("loyalty.points_per_currency"),
			placeholder: "0.01",
			required: true,
			min_value: 0.001,
			max_value: 1,
			precision: 3,
			tooltip: i18n.t("loyalty.points_per_currency_tooltip"),
			icon: "💰",
		},
		{
			fieldname: "points_expiry_days",
			fieldtype: "number",
			label: i18n.t("loyalty.expiry_days"),
			placeholder: "365",
			required: true,
			min_value: 1,
			max_value: 3650,
			default_value: 365,
			tooltip: i18n.t("loyalty.expiry_tooltip"),
			icon: "📅",
		},
		{
			fieldname: "min_redeem_points",
			fieldtype: "number",
			label: i18n.t("loyalty.min_redeem"),
			placeholder: "100",
			required: true,
			min_value: 1,
			default_value: 100,
			tooltip: i18n.t("loyalty.min_redeem_tooltip"),
			icon: "🎯",
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
	],

	track_changes: true,
};
