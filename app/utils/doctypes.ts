import type { DocType } from "./formSchema";

/**
 * The rooms a branch offers.
 *
 * Described rather than written out so the same rules drive what appears on
 * screen and what counts as valid.
 */
export const RoomDocType: DocType = {
  name: "Room",
  title: "Room",
  fields: [
    {
      fieldname: "name",
      label: "Name",
      fieldtype: "text",
      required: true,
      placeholder: "Kandang A3",
    },
    {
      fieldname: "type",
      label: "Type",
      fieldtype: "select",
      required: true,
      defaultValue: "standard",
      options: [
        { value: "standard", label: "Standard" },
        { value: "deluxe", label: "Deluxe" },
        { value: "suite", label: "Suite" },
      ],
    },
    {
      fieldname: "capacity",
      label: "Capacity",
      fieldtype: "number",
      required: true,
      defaultValue: "2",
      min: 1,
      max: 20,
      short: true,
    },
    {
      // A suite is sold on what comes with it, so it has to say.
      fieldname: "suiteExtras",
      label: "What the suite includes",
      fieldtype: "text",
      required: true,
      dependsOn: "type == suite",
      placeholder: "Private run, evening photo",
    },
  ],
};

/** A product in the catalogue. */
export const ProductDocType: DocType = {
  name: "Product",
  title: "Product",
  fields: [
    { fieldname: "name", label: "Name", fieldtype: "text", required: true },
    {
      fieldname: "sku",
      label: "Code",
      fieldtype: "text",
      required: true,
      short: true,
    },
    {
      fieldname: "category",
      label: "Category",
      fieldtype: "select",
      required: true,
      defaultValue: "Food",
      options: [
        { value: "Food", label: "Food" },
        { value: "Accessories", label: "Accessories" },
        { value: "Grooming", label: "Grooming" },
        { value: "Toys", label: "Toys" },
        { value: "Health", label: "Health" },
      ],
    },
    {
      fieldname: "price",
      label: "Price",
      fieldtype: "currency",
      required: true,
      min: 0,
      short: true,
    },
    {
      fieldname: "reorderLevel",
      label: "Reorder at",
      fieldtype: "number",
      min: 0,
      defaultValue: "0",
      short: true,
    },
  ],
};

/** An owner and the pet they bring in. */
export const CustomerDocType: DocType = {
  name: "Customer",
  title: "Customer",
  fields: [
    { fieldname: "name", label: "Name", fieldtype: "text", required: true },
    { fieldname: "email", label: "Email", fieldtype: "email" },
    { fieldname: "phone", label: "Phone", fieldtype: "text", short: true },
    { fieldname: "petName", label: "Pet", fieldtype: "text", short: true },
    {
      // Only worth asking once there is a pet to ask about.
      fieldname: "petSpecies",
      label: "Species",
      fieldtype: "text",
      short: true,
      dependsOn: "petName",
    },
    {
      fieldname: "petBreed",
      label: "Breed",
      fieldtype: "text",
      short: true,
      dependsOn: "petName",
    },
  ],
};

/**
 * Someone who works here.
 *
 * @param branches the branch names to choose from.
 * @returns the form description.
 */
export function staffDocType(branches: string[]): DocType {
  return {
    name: "Staff",
    title: "Staff",
    fields: [
      { fieldname: "name", label: "Name", fieldtype: "text", required: true },
      {
        fieldname: "email",
        label: "Email",
        fieldtype: "email",
        required: true,
      },
      {
        fieldname: "role",
        label: "Role",
        fieldtype: "select",
        required: true,
        defaultValue: "caretaker",
        options: [
          { value: "owner", label: "owner" },
          { value: "manager", label: "manager" },
          { value: "cashier", label: "cashier" },
          { value: "groomer", label: "groomer" },
          { value: "caretaker", label: "caretaker" },
        ],
      },
      {
        fieldname: "branch",
        label: "Branch",
        fieldtype: "select",
        required: true,
        defaultValue: branches[0] ?? "",
        options: branches.map((branch) => ({ value: branch, label: branch })),
      },
      { fieldname: "phone", label: "Phone", fieldtype: "text", short: true },
      {
        fieldname: "commissionRate",
        label: "Commission %",
        fieldtype: "number",
        min: 0,
        max: 100,
        defaultValue: "0",
        short: true,
      },
    ],
  };
}

/** Somewhere stock is bought from. */
export const SupplierDocType: DocType = {
  name: "Supplier",
  title: "Supplier",
  fields: [
    { fieldname: "name", label: "Name", fieldtype: "text", required: true },
    { fieldname: "contact", label: "Contact", fieldtype: "text" },
    { fieldname: "phone", label: "Phone", fieldtype: "text", short: true },
    {
      fieldname: "terms",
      label: "Terms",
      fieldtype: "text",
      short: true,
      defaultValue: "Net 30",
    },
  ],
};

/**
 * Somewhere stock is kept.
 *
 * @param branches the branch names to choose from.
 * @returns the form description.
 */
export function warehouseDocType(branches: string[]): DocType {
  return {
    name: "Warehouse",
    title: "Warehouse",
    fields: [
      { fieldname: "name", label: "Name", fieldtype: "text", required: true },
      {
        fieldname: "branch",
        label: "Branch",
        fieldtype: "select",
        required: true,
        defaultValue: branches[0] ?? "",
        options: branches.map((branch) => ({ value: branch, label: branch })),
      },
    ],
  };
}

/** A place the shop trades from. */
export const BranchDocType: DocType = {
  name: "Branch",
  title: "Branch",
  fields: [
    { fieldname: "name", label: "Name", fieldtype: "text", required: true },
    { fieldname: "address", label: "Address", fieldtype: "text" },
    { fieldname: "phone", label: "Phone", fieldtype: "text", short: true },
    { fieldname: "manager", label: "Manager", fieldtype: "text" },
  ],
};
