import { FilterValidation } from "../validations";
import type { Filter } from "./FilterHelper";
import { createFilterSchema } from "./FilterHelper";

const { FilterSchema, FilterListSchema } = createFilterSchema({
  createdAt: "date",
  title: "string",
  collectionId: "uuid",
  views: "number",
  isDraft: "boolean",
} as const);

const uuid = "00000000-0000-4000-8000-000000000000";

const leaf: Filter = { field: "title", operator: "eq", value: "x" };

/** Build a flat OR group that holds `count` leaves, for a total of count + 1 nodes. */
function groupOf(count: number): Filter {
  return {
    operator: "OR",
    filters: Array.from({ length: count }, () => leaf),
  };
}

describe("createFilterSchema value validation", () => {
  describe("uuid fields", () => {
    it("accepts a valid uuid", () => {
      expect(
        FilterSchema.safeParse({
          field: "collectionId",
          operator: "eq",
          value: uuid,
        }).success
      ).toBe(true);
    });

    it("rejects a non-uuid value", () => {
      expect(
        FilterSchema.safeParse({
          field: "collectionId",
          operator: "eq",
          value: "garbage",
        }).success
      ).toBe(false);
    });

    it("validates every entry of an `in` array", () => {
      expect(
        FilterSchema.safeParse({
          field: "collectionId",
          operator: "in",
          value: [uuid, "garbage"],
        }).success
      ).toBe(false);

      expect(
        FilterSchema.safeParse({
          field: "collectionId",
          operator: "in",
          value: [uuid],
        }).success
      ).toBe(true);
    });

    it("rejects pattern-matching operators on non-text fields", () => {
      expect(
        FilterSchema.safeParse({
          field: "collectionId",
          operator: "contains",
          value: uuid,
        }).success
      ).toBe(false);
    });
  });

  describe("date fields", () => {
    it("accepts an ISO date", () => {
      expect(
        FilterSchema.safeParse({
          field: "createdAt",
          operator: "gt",
          value: "2024-01-01T00:00:00.000Z",
        }).success
      ).toBe(true);
    });

    it("accepts a bare ISO date", () => {
      expect(
        FilterSchema.safeParse({
          field: "createdAt",
          operator: "gt",
          value: "2024-01-01",
        }).success
      ).toBe(true);
    });

    it("rejects an unparseable date", () => {
      expect(
        FilterSchema.safeParse({
          field: "createdAt",
          operator: "gt",
          value: "notadate",
        }).success
      ).toBe(false);
    });

    it("accepts an ISO 8601 duration for range operators", () => {
      expect(
        FilterSchema.safeParse({
          field: "createdAt",
          operator: "gte",
          value: "-P7D",
        }).success
      ).toBe(true);
    });

    it("rejects an ISO 8601 duration for equality operators", () => {
      expect(
        FilterSchema.safeParse({
          field: "createdAt",
          operator: "eq",
          value: "-P7D",
        }).success
      ).toBe(false);
    });
  });

  describe("string fields", () => {
    it("accepts a string value and pattern operators", () => {
      expect(
        FilterSchema.safeParse({
          field: "title",
          operator: "contains",
          value: "hello",
        }).success
      ).toBe(true);
    });

    it("rejects a non-string value", () => {
      expect(
        FilterSchema.safeParse({
          field: "title",
          operator: "eq",
          value: 5,
        }).success
      ).toBe(false);
    });
  });

  describe("number and boolean fields", () => {
    it("validates number values", () => {
      expect(
        FilterSchema.safeParse({
          field: "views",
          operator: "eq",
          value: 5,
        }).success
      ).toBe(true);
      expect(
        FilterSchema.safeParse({
          field: "views",
          operator: "eq",
          value: "5",
        }).success
      ).toBe(false);
    });

    it("validates boolean values", () => {
      expect(
        FilterSchema.safeParse({
          field: "isDraft",
          operator: "eq",
          value: true,
        }).success
      ).toBe(true);
      expect(
        FilterSchema.safeParse({
          field: "isDraft",
          operator: "eq",
          value: "true",
        }).success
      ).toBe(false);
    });
  });

  it("still allows null operators with no value", () => {
    expect(
      FilterSchema.safeParse({
        field: "createdAt",
        operator: "isNull",
      }).success
    ).toBe(true);
  });
});

describe("createFilterSchema operator allowlists", () => {
  const { FilterSchema: RestrictedSchema } = createFilterSchema({
    userId: { kind: "uuid", operators: ["eq", "in"] },
    title: "string",
  } as const);

  it("accepts an allowed operator", () => {
    expect(
      RestrictedSchema.safeParse({
        field: "userId",
        operator: "eq",
        value: uuid,
      }).success
    ).toBe(true);
    expect(
      RestrictedSchema.safeParse({
        field: "userId",
        operator: "in",
        value: [uuid],
      }).success
    ).toBe(true);
  });

  it("rejects operators outside the allowlist", () => {
    for (const operator of ["neq", "notIn", "isNull", "isNotNull", "lt"]) {
      const result = RestrictedSchema.safeParse({
        field: "userId",
        operator,
        ...(operator === "isNull" || operator === "isNotNull"
          ? {}
          : { value: operator === "notIn" ? [uuid] : uuid }),
      });
      expect(result.success).toBe(false);
    }
  });

  it("does not restrict fields without an allowlist", () => {
    expect(
      RestrictedSchema.safeParse({
        field: "title",
        operator: "neq",
        value: "x",
      }).success
    ).toBe(true);
  });

  it("rejects a disallowed operator nested inside a group", () => {
    expect(
      RestrictedSchema.safeParse({
        operator: "OR",
        filters: [
          { field: "title", operator: "eq", value: "x" },
          { field: "userId", operator: "neq", value: uuid },
        ],
      }).success
    ).toBe(false);
  });
});

describe("createFilterSchema value allowlists", () => {
  const { FilterSchema: EnumSchema } = createFilterSchema({
    role: { kind: "string", values: ["admin", "member"] },
    title: "string",
  } as const);

  it("accepts an allowed value", () => {
    expect(
      EnumSchema.safeParse({
        field: "role",
        operator: "eq",
        value: "admin",
      }).success
    ).toBe(true);
  });

  it("rejects a value outside the allowlist", () => {
    expect(
      EnumSchema.safeParse({
        field: "role",
        operator: "eq",
        value: "superuser",
      }).success
    ).toBe(false);
  });

  it("validates every entry of an `in` array", () => {
    expect(
      EnumSchema.safeParse({
        field: "role",
        operator: "in",
        value: ["admin", "member"],
      }).success
    ).toBe(true);

    expect(
      EnumSchema.safeParse({
        field: "role",
        operator: "in",
        value: ["admin", "superuser"],
      }).success
    ).toBe(false);
  });

  it("rejects pattern matching against a value-constrained field", () => {
    expect(
      EnumSchema.safeParse({
        field: "role",
        operator: "contains",
        value: "adm",
      }).success
    ).toBe(false);
  });

  it("does not restrict fields without an allowlist", () => {
    expect(
      EnumSchema.safeParse({
        field: "title",
        operator: "eq",
        value: "superuser",
      }).success
    ).toBe(true);
  });

  it("still allows null operators with no value", () => {
    expect(
      EnumSchema.safeParse({
        field: "role",
        operator: "isNull",
      }).success
    ).toBe(true);
  });

  it("rejects a disallowed value nested inside a group", () => {
    expect(
      EnumSchema.safeParse({
        operator: "AND",
        filters: [
          { field: "title", operator: "eq", value: "x" },
          { field: "role", operator: "eq", value: "superuser" },
        ],
      }).success
    ).toBe(false);
  });
});

describe("createFilterSchema node limit", () => {
  const { maxNodes } = FilterValidation;

  it("accepts an expression at the node limit", () => {
    expect(FilterSchema.safeParse(groupOf(maxNodes - 1)).success).toBe(true);
  });

  it("rejects an expression over the node limit", () => {
    expect(FilterSchema.safeParse(groupOf(maxNodes)).success).toBe(false);
  });

  it("rejects a wide expression that stays inside the depth limit", () => {
    // Depth 3 and 7 filters per group is well inside both shape limits, yet
    // holds 57 nodes.
    const wide: Filter = {
      operator: "OR",
      filters: Array.from({ length: 7 }, () => groupOf(7)),
    };
    expect(FilterSchema.safeParse(wide).success).toBe(false);
  });

  it("accepts a list at the node limit", () => {
    const filters = Array.from({ length: maxNodes }, () => leaf);
    expect(FilterListSchema.safeParse(filters).success).toBe(true);
  });

  it("rejects a list whose entries total over the node limit", () => {
    // Each entry is inside the per-expression limit; the sum is not.
    const filters = Array.from({ length: 5 }, () => groupOf(10));
    expect(FilterListSchema.safeParse(filters).success).toBe(false);
  });

  it("rejects an empty list", () => {
    expect(FilterListSchema.safeParse([]).success).toBe(false);
  });
});
