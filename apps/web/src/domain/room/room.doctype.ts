import type { TDocType } from "@/lib/form-builder/types";

export const RoomDocType: TDocType = {
	name: "Room",
	title_field: "name",
	description: "Manajemen kamar penitipan (boarding)",
	fields: [
		{
			fieldname: "name",
			label: "Nama Kamar",
			fieldtype: "text",
			required: true,
			placeholder: "Contoh: Kandang Kucing VIP 01",
		},
		{
			fieldname: "roomType",
			label: "Tipe Kamar",
			fieldtype: "select",
			required: true,
			default_value: "standard",
			colspan: 1,
			options: [
				{ value: "standard", label: "Standard" },
				{ value: "deluxe", label: "Deluxe" },
				{ value: "suite", label: "Suite" },
				{ value: "vip", label: "VIP" },
			],
		},
		{
			fieldname: "capacity",
			label: "Kapasitas (Ekor)",
			fieldtype: "number",
			required: true,
			min_value: 1,
			default_value: 1,
			colspan: 1,
		},
		{
			fieldname: "dailyRate",
			label: "Tarif per Hari",
			fieldtype: "currency",
			required: true,
			min_value: 0,
			default_value: 0,
			placeholder: "50000",
		},
		{
			fieldname: "description",
			label: "Deskripsi (Opsional)",
			fieldtype: "long_text",
			placeholder: "Fasilitas AC, mainan, dll...",
		},
		{
			fieldname: "isActive",
			label: "Kamar Aktif (Bisa dibooking)",
			fieldtype: "check",
			default_value: true,
		},
	],
};
