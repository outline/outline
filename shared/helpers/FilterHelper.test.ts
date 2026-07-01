import { createFilterSchema } from "./FilterHelper";

const { FilterSchema } = createFilterSchema({
  createdAt: "date",
  title: "string",
  collectionId: "uuid",
  views: "number",
  isDraft: "boolean",
} as const);

const uuid = "00000000-0000-4000-8000-000000000000";

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
