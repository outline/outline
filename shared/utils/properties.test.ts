import { v4 as uuidv4 } from "uuid";
import type { Property } from "../types";
import { DataViewType, FilterOperator, PropertyType } from "../types";
import {
  coerceDocumentProperties,
  coercePropertyValue,
  validateDataSchema,
  validateDataViews,
} from "./properties";

const textProperty: Property = {
  id: uuidv4(),
  name: "Description",
  type: PropertyType.Text,
};

const numberProperty: Property = {
  id: uuidv4(),
  name: "Priority",
  type: PropertyType.Number,
};

const checkboxProperty: Property = {
  id: uuidv4(),
  name: "Done",
  type: PropertyType.Checkbox,
};

const selectProperty: Property = {
  id: uuidv4(),
  name: "Status",
  type: PropertyType.Select,
  options: [
    { id: "todo", name: "To do" },
    { id: "done", name: "Done", color: "#00FF00" },
  ],
};

const multiSelectProperty: Property = {
  id: uuidv4(),
  name: "Tags",
  type: PropertyType.MultiSelect,
  options: [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" },
  ],
};

const dateProperty: Property = {
  id: uuidv4(),
  name: "Due",
  type: PropertyType.Date,
};

const urlProperty: Property = {
  id: uuidv4(),
  name: "Link",
  type: PropertyType.Url,
};

const personProperty: Property = {
  id: uuidv4(),
  name: "Owner",
  type: PropertyType.Person,
};

const schema: Property[] = [
  textProperty,
  numberProperty,
  checkboxProperty,
  selectProperty,
  multiSelectProperty,
  dateProperty,
  urlProperty,
  personProperty,
];

describe("validateDataSchema", () => {
  it("should accept a valid schema", () => {
    expect(() => validateDataSchema(schema)).not.toThrow();
  });

  it("should accept an empty schema", () => {
    expect(() => validateDataSchema([])).not.toThrow();
  });

  it("should reject non-array values", () => {
    expect(() => validateDataSchema({})).toThrow();
    expect(() => validateDataSchema("nope")).toThrow();
    expect(() => validateDataSchema(null)).toThrow();
  });

  it("should reject properties without a UUID id", () => {
    expect(() =>
      validateDataSchema([{ id: "abc", name: "A", type: PropertyType.Text }])
    ).toThrow(/UUID/);
  });

  it("should reject unknown property types", () => {
    expect(() =>
      validateDataSchema([{ id: uuidv4(), name: "A", type: "formula" }])
    ).toThrow(/Unknown property type/);
  });

  it("should reject empty property names", () => {
    expect(() =>
      validateDataSchema([
        { id: uuidv4(), name: "  ", type: PropertyType.Text },
      ])
    ).toThrow(/name/);
  });

  it("should reject duplicate property ids", () => {
    const id = uuidv4();
    expect(() =>
      validateDataSchema([
        { id, name: "A", type: PropertyType.Text },
        { id, name: "B", type: PropertyType.Text },
      ])
    ).toThrow(/Duplicate property id/);
  });

  it("should reject duplicate property names case-insensitively", () => {
    expect(() =>
      validateDataSchema([
        { id: uuidv4(), name: "Status", type: PropertyType.Text },
        { id: uuidv4(), name: "status", type: PropertyType.Text },
      ])
    ).toThrow(/Duplicate property name/);
  });

  it("should reject duplicate option ids", () => {
    expect(() =>
      validateDataSchema([
        {
          id: uuidv4(),
          name: "Status",
          type: PropertyType.Select,
          options: [
            { id: "x", name: "One" },
            { id: "x", name: "Two" },
          ],
        },
      ])
    ).toThrow(/Duplicate option id/);
  });
});

describe("validateDataViews", () => {
  const validView = {
    id: uuidv4(),
    name: "All documents",
    type: DataViewType.Table,
    columns: [{ propertyId: selectProperty.id, visible: true, width: 120 }],
    sorts: [{ propertyId: numberProperty.id, direction: "desc" as const }],
    filter: {
      conjunction: "and" as const,
      conditions: [
        {
          propertyId: selectProperty.id,
          operator: FilterOperator.Is,
          value: "todo",
        },
        {
          conjunction: "or" as const,
          conditions: [
            {
              propertyId: checkboxProperty.id,
              operator: FilterOperator.IsNot,
              value: true,
            },
          ],
        },
      ],
    },
  };

  it("should accept a valid view", () => {
    expect(() => validateDataViews([validView], schema)).not.toThrow();
  });

  it("should accept views without a schema to check against", () => {
    expect(() => validateDataViews([validView])).not.toThrow();
  });

  it("should reject non-array values", () => {
    expect(() => validateDataViews({})).toThrow();
  });

  it("should reject unknown view types", () => {
    expect(() =>
      validateDataViews([{ ...validView, type: "board" }], schema)
    ).toThrow(/Unknown view type/);
  });

  it("should reject columns referencing unknown properties", () => {
    expect(() =>
      validateDataViews(
        [{ ...validView, columns: [{ propertyId: uuidv4(), visible: true }] }],
        schema
      )
    ).toThrow(/Unknown property id/);
  });

  it("should reject invalid sort directions", () => {
    expect(() =>
      validateDataViews(
        [
          {
            ...validView,
            sorts: [{ propertyId: numberProperty.id, direction: "up" }],
          },
        ],
        schema
      )
    ).toThrow(/direction/);
  });

  it("should reject unknown filter operators", () => {
    expect(() =>
      validateDataViews(
        [
          {
            ...validView,
            filter: {
              conjunction: "and",
              conditions: [
                { propertyId: selectProperty.id, operator: "startsWith" },
              ],
            },
          },
        ],
        schema
      )
    ).toThrow(/Unknown filter operator/);
  });

  it("should reject overly deep filter nesting", () => {
    let filter: Record<string, unknown> = {
      conjunction: "and",
      conditions: [
        { propertyId: selectProperty.id, operator: FilterOperator.IsEmpty },
      ],
    };
    for (let i = 0; i < 6; i++) {
      filter = { conjunction: "or", conditions: [filter] };
    }
    expect(() => validateDataViews([{ ...validView, filter }], schema)).toThrow(
      /nested/
    );
  });

  it("should reject duplicate view ids", () => {
    expect(() => validateDataViews([validView, validView], schema)).toThrow(
      /Duplicate view id/
    );
  });
});

describe("coercePropertyValue", () => {
  it("should pass through and coerce text values", () => {
    expect(coercePropertyValue(textProperty, "hello")).toBe("hello");
    expect(coercePropertyValue(textProperty, 42)).toBe("42");
    expect(coercePropertyValue(textProperty, true)).toBe("true");
    expect(coercePropertyValue(textProperty, ["a"])).toBeUndefined();
  });

  it("should coerce number values", () => {
    expect(coercePropertyValue(numberProperty, 3)).toBe(3);
    expect(coercePropertyValue(numberProperty, "3.5")).toBe(3.5);
    expect(coercePropertyValue(numberProperty, "abc")).toBeUndefined();
    expect(coercePropertyValue(numberProperty, Infinity)).toBeUndefined();
    expect(coercePropertyValue(numberProperty, "")).toBeUndefined();
  });

  it("should coerce checkbox values", () => {
    expect(coercePropertyValue(checkboxProperty, true)).toBe(true);
    expect(coercePropertyValue(checkboxProperty, "false")).toBe(false);
    expect(coercePropertyValue(checkboxProperty, 1)).toBeUndefined();
  });

  it("should validate select values against options", () => {
    expect(coercePropertyValue(selectProperty, "todo")).toBe("todo");
    expect(coercePropertyValue(selectProperty, "unknown")).toBeUndefined();
    expect(coercePropertyValue(selectProperty, 1)).toBeUndefined();
  });

  it("should filter multiSelect values to known options", () => {
    expect(coercePropertyValue(multiSelectProperty, ["a", "b"])).toEqual([
      "a",
      "b",
    ]);
    expect(coercePropertyValue(multiSelectProperty, ["a", "zzz"])).toEqual([
      "a",
    ]);
    expect(coercePropertyValue(multiSelectProperty, "a")).toEqual(["a"]);
    expect(coercePropertyValue(multiSelectProperty, ["a", "a"])).toEqual(["a"]);
    expect(coercePropertyValue(multiSelectProperty, ["zzz"])).toBeUndefined();
  });

  it("should validate date values", () => {
    expect(coercePropertyValue(dateProperty, "2026-08-01")).toBe("2026-08-01");
    expect(coercePropertyValue(dateProperty, "2026-08-01T10:00:00.000Z")).toBe(
      "2026-08-01T10:00:00.000Z"
    );
    expect(coercePropertyValue(dateProperty, "not a date")).toBeUndefined();
    expect(coercePropertyValue(dateProperty, 1234567890)).toBeUndefined();
  });

  it("should validate url values", () => {
    expect(coercePropertyValue(urlProperty, "https://example.com")).toBe(
      "https://example.com"
    );
    expect(coercePropertyValue(urlProperty, "")).toBeUndefined();
    expect(coercePropertyValue(urlProperty, 5)).toBeUndefined();
  });

  it("should validate person values as UUIDs", () => {
    const id = uuidv4();
    expect(coercePropertyValue(personProperty, id)).toBe(id);
    expect(coercePropertyValue(personProperty, "jane")).toBeUndefined();
  });

  it("should drop null and undefined values", () => {
    expect(coercePropertyValue(textProperty, null)).toBeUndefined();
    expect(coercePropertyValue(textProperty, undefined)).toBeUndefined();
  });
});

describe("coerceDocumentProperties", () => {
  it("should keep valid values and drop unknown keys", () => {
    const result = coerceDocumentProperties(
      {
        [textProperty.id]: "hello",
        [numberProperty.id]: "7",
        [selectProperty.id]: "done",
        "not-a-property": "value",
      },
      schema
    );
    expect(result).toEqual({
      [textProperty.id]: "hello",
      [numberProperty.id]: 7,
      [selectProperty.id]: "done",
    });
  });

  it("should drop values that cannot be coerced", () => {
    const result = coerceDocumentProperties(
      {
        [numberProperty.id]: "not a number",
        [selectProperty.id]: "unknown-option",
      },
      schema
    );
    expect(result).toEqual({});
  });

  it("should remove keys set to null", () => {
    const result = coerceDocumentProperties(
      { [textProperty.id]: null },
      schema
    );
    expect(result).toEqual({});
  });

  it("should return an empty object without a schema", () => {
    expect(coerceDocumentProperties({ a: 1 }, null)).toEqual({});
    expect(coerceDocumentProperties({ a: 1 }, undefined)).toEqual({});
  });

  it("should return an empty object for non-object input", () => {
    expect(coerceDocumentProperties("nope", schema)).toEqual({});
    expect(coerceDocumentProperties([1, 2], schema)).toEqual({});
    expect(coerceDocumentProperties(null, schema)).toEqual({});
  });
});
