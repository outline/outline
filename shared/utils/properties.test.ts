import { v4 as uuidv4 } from "uuid";
import type { Property } from "../types";
import {
  DataViewType,
  FilterOperator,
  PropertyType,
  RollupAggregation,
} from "../types";
import {
  coerceDocumentProperties,
  coercePropertyValue,
  groupByProperty,
  groupOptionIdForValue,
  isGroupableProperty,
  validateDataSchema,
  validateDataViews,
  visiblePropertiesForView,
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

const relationProperty: Property = {
  id: uuidv4(),
  name: "Linked",
  type: PropertyType.Relation,
  config: { targetCollectionId: uuidv4() },
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
  relationProperty,
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
      validateDataViews([{ ...validView, type: "timeline" }], schema)
    ).toThrow(/Unknown view type/);
  });

  it("should accept board, list and gallery view types", () => {
    for (const type of [
      DataViewType.Board,
      DataViewType.List,
      DataViewType.Gallery,
    ]) {
      expect(() =>
        validateDataViews([{ ...validView, type }], schema)
      ).not.toThrow();
    }
  });

  it("should accept grouping by a select property", () => {
    expect(() =>
      validateDataViews(
        [
          {
            ...validView,
            type: DataViewType.Board,
            groupBy: selectProperty.id,
          },
        ],
        schema
      )
    ).not.toThrow();
  });

  it("should reject grouping by a non-groupable property", () => {
    expect(() =>
      validateDataViews(
        [{ ...validView, type: DataViewType.Board, groupBy: textProperty.id }],
        schema
      )
    ).toThrow(/cannot be used to group/);
  });

  it("should reject grouping by an unknown property", () => {
    expect(() =>
      validateDataViews(
        [{ ...validView, type: DataViewType.Board, groupBy: uuidv4() }],
        schema
      )
    ).toThrow(/Unknown property id/);
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

  it("should coerce relation values to unique document ids", () => {
    const a = uuidv4();
    const b = uuidv4();
    expect(coercePropertyValue(relationProperty, [a, b, a])).toEqual([a, b]);
    expect(coercePropertyValue(relationProperty, a)).toEqual([a]);
    expect(coercePropertyValue(relationProperty, ["nope", a])).toEqual([a]);
    expect(coercePropertyValue(relationProperty, ["nope"])).toBeUndefined();
    expect(coercePropertyValue(relationProperty, 42)).toBeUndefined();
  });

  it("should reject relation config without a UUID target", () => {
    expect(() =>
      validateDataSchema([
        {
          id: uuidv4(),
          name: "Linked",
          type: PropertyType.Relation,
          config: { targetCollectionId: "not-a-uuid" },
        },
      ])
    ).toThrow(/targetCollectionId/);
  });

  it("should never store rollup values", () => {
    const rollup: Property = {
      id: uuidv4(),
      name: "Total",
      type: PropertyType.Rollup,
      config: {
        relationPropertyId: relationProperty.id,
        rollupPropertyId: numberProperty.id,
        rollupAggregation: RollupAggregation.Sum,
      },
    };
    expect(coercePropertyValue(rollup, 42)).toBeUndefined();
    expect(coercePropertyValue(rollup, [1, 2])).toBeUndefined();
  });

  it("should validate rollup schema references", () => {
    const base = {
      id: uuidv4(),
      name: "Total",
      type: PropertyType.Rollup,
    };
    // valid: aggregates across a relation in the same schema
    expect(() =>
      validateDataSchema([
        relationProperty,
        {
          ...base,
          config: {
            relationPropertyId: relationProperty.id,
            rollupPropertyId: uuidv4(),
            rollupAggregation: RollupAggregation.Sum,
          },
        },
      ])
    ).not.toThrow();
    // missing config entirely
    expect(() => validateDataSchema([relationProperty, base])).toThrow(
      /relation property/
    );
    // relation reference points at a non-relation property
    expect(() =>
      validateDataSchema([
        relationProperty,
        {
          ...base,
          config: {
            relationPropertyId: relationProperty.id,
            rollupAggregation: "median",
          },
        },
      ])
    ).toThrow(/aggregation/);
    // non-count aggregation requires a target property
    expect(() =>
      validateDataSchema([
        relationProperty,
        {
          ...base,
          config: {
            relationPropertyId: relationProperty.id,
            rollupAggregation: RollupAggregation.Sum,
          },
        },
      ])
    ).toThrow(/aggregate/);
    // relationPropertyId must exist in the schema
    expect(() =>
      validateDataSchema([
        relationProperty,
        {
          ...base,
          config: {
            relationPropertyId: uuidv4(),
            rollupAggregation: RollupAggregation.Count,
          },
        },
      ])
    ).toThrow(/same schema/);
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

describe("isGroupableProperty", () => {
  it("should accept select and multiSelect properties", () => {
    expect(isGroupableProperty(selectProperty)).toBe(true);
    expect(isGroupableProperty(multiSelectProperty)).toBe(true);
  });

  it("should reject other property types", () => {
    expect(isGroupableProperty(textProperty)).toBe(false);
    expect(isGroupableProperty(numberProperty)).toBe(false);
    expect(isGroupableProperty(checkboxProperty)).toBe(false);
    expect(isGroupableProperty(dateProperty)).toBe(false);
    expect(isGroupableProperty(personProperty)).toBe(false);
  });
});

describe("groupOptionIdForValue", () => {
  it("should resolve a select value to its option id", () => {
    expect(groupOptionIdForValue(selectProperty, "todo")).toBe("todo");
  });

  it("should resolve a multiSelect value to its first option", () => {
    expect(groupOptionIdForValue(multiSelectProperty, ["b", "a"])).toBe("b");
  });

  it("should resolve empty and unknown values to null", () => {
    expect(groupOptionIdForValue(selectProperty, undefined)).toBe(null);
    expect(groupOptionIdForValue(selectProperty, null)).toBe(null);
    expect(groupOptionIdForValue(selectProperty, "missing")).toBe(null);
    expect(groupOptionIdForValue(multiSelectProperty, [])).toBe(null);
    expect(groupOptionIdForValue(multiSelectProperty, ["missing"])).toBe(null);
  });
});

describe("groupByProperty", () => {
  type Row = { title: string; value?: string | string[] | null };
  const rows: Row[] = [
    { title: "one", value: "todo" },
    { title: "two", value: "done" },
    { title: "three" },
    { title: "four", value: "todo" },
    { title: "five", value: "missing" },
  ];

  it("should bucket items by option in option order with no-value first", () => {
    const groups = groupByProperty(rows, selectProperty, (row) => row.value);
    expect(groups.map((group) => group.option?.id ?? null)).toEqual([
      null,
      "todo",
      "done",
    ]);
    expect(groups[0].items.map((row) => row.title)).toEqual(["three", "five"]);
    expect(groups[1].items.map((row) => row.title)).toEqual(["one", "four"]);
    expect(groups[2].items.map((row) => row.title)).toEqual(["two"]);
  });

  it("should keep empty buckets so columns are stable", () => {
    const groups = groupByProperty([], selectProperty, (row: Row) => row.value);
    expect(groups).toHaveLength(3);
    expect(groups.every((group) => group.items.length === 0)).toBe(true);
  });

  it("should group multiSelect items by their first option", () => {
    const groups = groupByProperty(
      [{ title: "one", value: ["b", "a"] } as Row],
      multiSelectProperty,
      (row) => row.value
    );
    expect(groups.map((group) => group.option?.id ?? null)).toEqual([
      null,
      "a",
      "b",
    ]);
    expect(groups[2].items.map((row) => row.title)).toEqual(["one"]);
  });
});

describe("visiblePropertiesForView", () => {
  const view = {
    id: uuidv4(),
    name: "Table",
    type: DataViewType.Table,
    columns: [
      { propertyId: numberProperty.id, visible: false },
      { propertyId: selectProperty.id, visible: true },
    ],
    sorts: [],
  };

  it("should hide properties marked not visible", () => {
    const visible = visiblePropertiesForView(schema, view);
    expect(visible.map((property) => property.id)).not.toContain(
      numberProperty.id
    );
  });

  it("should keep properties without a column entry visible in schema order", () => {
    const visible = visiblePropertiesForView(schema, view);
    expect(visible.map((property) => property.id)).toEqual(
      schema
        .filter((property) => property.id !== numberProperty.id)
        .map((property) => property.id)
    );
  });

  it("should show all properties without a view or column config", () => {
    expect(visiblePropertiesForView(schema)).toEqual(schema);
    expect(visiblePropertiesForView(schema, null)).toEqual(schema);
    expect(visiblePropertiesForView(schema, { ...view, columns: [] })).toEqual(
      schema
    );
  });
});
