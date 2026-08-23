/**
 * Example DocType Schema - Product
 * Demonstrates the form builder system
 */

import type { TDocType } from "../types";

export const ProductDocType: TDocType = {
	name: "Product",
	module: "Product",
	description: "Manages product catalog and inventory",
	icon: "📦",

	title_field: "name",
	search_fields: "name,sku,category",
	sort_field: "created_at",
	sort_order: "DESC",

	fields: [
		// Basic Info Section
		{
			fieldname: "section_basic",
			fieldtype: "section_break",
			label: "Informasi Dasar",
			description: "Data utama produk",
		},
		{
			fieldname: "name",
			fieldtype: "text",
			label: "Nama Produk",
			placeholder: "e.g. Royal Canin Adult",
			required: true,
			max_length: 100,
			in_list_view: true,
			is_primary_field: true,
		},
		{
			fieldname: "sku",
			fieldtype: "text",
			label: "SKU",
			placeholder: "e.g. RC-001",
			max_length: 50,
			in_list_view: true,
			in_filter: true,
			tooltip: "Stock Keeping Unit - kode unik untuk identifikasi produk",
			icon: "📦",
		},
		{
			fieldname: "category",
			fieldtype: "select",
			label: "Kategori",
			required: true,
			in_list_view: true,
			in_standard_filter: true,
			options: [
				{ value: "food", label: "Makanan" },
				{ value: "accessories", label: "Aksesoris" },
				{ value: "medicine", label: "Obat-obatan" },
				{ value: "grooming", label: "Grooming" },
				{ value: "toys", label: "Mainan" },
				{ value: "other", label: "Lainnya" },
			],
		},
		{
			fieldname: "description",
			fieldtype: "long_text",
			label: "Deskripsi",
			placeholder: "Deskripsi produk...",
			max_length: 500,
		},

		// Pricing Section
		{
			fieldname: "section_pricing",
			fieldtype: "section_break",
			label: "Harga & Stok",
			description: "Informasi harga dan ketersediaan",
		},
		{
			fieldname: "price",
			fieldtype: "currency",
			label: "Harga Jual",
			placeholder: "0",
			required: true,
			min_value: 0,
			precision: 0,
			in_list_view: true,
			tooltip:
				"Harga jual ke pelanggan. Harga ini sudah termasuk PPN jika applicable.",
		},
		{
			fieldname: "cost_price",
			fieldtype: "currency",
			label: "Harga Modal",
			placeholder: "0",
			min_value: 0,
			precision: 0,
			permlevel: 1, // Only visible to Manager+
		},
		{
			fieldname: "stock",
			fieldtype: "number",
			label: "Stok",
			placeholder: "0",
			required: true,
			min_value: 0,
			in_list_view: true,
		},
		{
			fieldname: "low_stock_threshold",
			fieldtype: "number",
			label: "Ambang Stok Rendah",
			placeholder: "5",
			min_value: 0,
			default_value: 5,
			description: "Peringatan jika stok di bawah angka ini",
			tooltip:
				"Sistem akan memberikan notifikasi ketika stok produk mencapai angka ini",
			icon: "⚠️",
		},

		// Status Section
		{
			fieldname: "section_status",
			fieldtype: "section_break",
			label: "Status",
		},
		{
			fieldname: "is_active",
			fieldtype: "check",
			label: "Aktif",
			default_value: true,
		},
		{
			fieldname: "is_featured",
			fieldtype: "check",
			label: "Produk Unggulan",
		},
		{
			fieldname: "weight",
			fieldtype: "number",
			label: "Berat (gram)",
			placeholder: "0",
			min_value: 0,
		},
		{
			fieldname: "color",
			fieldtype: "color",
			label: "Warna",
			placeholder: "#000000",
		},

		// Media Section
		{
			fieldname: "section_media",
			fieldtype: "section_break",
			label: "Media",
		},
		{
			fieldname: "rating",
			fieldtype: "rating",
			label: "Rating",
			default_value: 0,
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
			write: true,
			create: true,
			delete: false,
		},
		{
			role: "viewer",
			read: true,
			write: false,
			create: false,
			delete: false,
		},
	],

	actions: [
		{
			label: "Duplikat",
			action_type: "client",
			handler: "duplicateProduct",
			variant: "outline",
			icon: "copy",
		},
	],

	track_changes: true,
};
