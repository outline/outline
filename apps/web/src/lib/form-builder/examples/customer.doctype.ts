import type { TDocType } from "../types";

export const getCustomerDocType = (t: (key: string) => string): TDocType => ({
	name: "Customer",
	fields: [
		{
			fieldname: "fullName",
			label: t("customers.labels.owner_name"),
			fieldtype: "text",
			required: true,
			placeholder: t("boarding_form.placeholders.owner_name"),
		},
		{
			fieldname: "phone",
			label: t("customers.labels.owner_phone"),
			fieldtype: "phone",
			required: true,
			placeholder: t("boarding_form.placeholders.owner_phone"),
		},
		{
			fieldname: "email",
			label: t("customers.table.email"),
			fieldtype: "text",
			placeholder: "e.g. budi@gmail.com",
		},
		{
			fieldname: "address",
			label: t("customers.table.address"),
			fieldtype: "long_text",
			placeholder: t("boarding_form.placeholders.owner_address"),
		},
		{
			fieldname: "notes",
			label: t("common.description"),
			fieldtype: "long_text",
			placeholder: "",
		},
	],
});
