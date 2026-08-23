export type TLinkOption = {
	readonly value: string;
	readonly label: string;
};

export type TLinkDoctype = "Branch" | "Customer" | "Product" | "Staff" | "Room";

export const DOCTYPE_TABLE_MAP: Record<
	TLinkDoctype,
	{ table: string; labelField: string; valueField: string }
> = {
	Branch: { table: "branches", labelField: "name", valueField: "id" },
	Customer: { table: "customers", labelField: "full_name", valueField: "id" },
	Product: { table: "products", labelField: "name", valueField: "id" },
	Staff: { table: "staff", labelField: "full_name", valueField: "id" },
	Room: { table: "rooms", labelField: "name", valueField: "id" },
};
