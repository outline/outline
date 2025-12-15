import { Op } from "sequelize";
import { buildWhere } from "./Filters";

describe("buildWhere", () => {
  describe("single conditions", () => {
    it("should handle eq operator", () => {
      const filter = {
        field: "title",
        operator: "eq",
        value: "Test Document",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.eq]: "Test Document" },
      });
    });

    it("should handle neq operator", () => {
      const filter = {
        field: "status",
        operator: "neq",
        value: "archived",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        status: { [Op.ne]: "archived" },
      });
    });

    it("should handle lt operator", () => {
      const filter = {
        field: "views",
        operator: "lt",
        value: 100,
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        views: { [Op.lt]: 100 },
      });
    });

    it("should handle lte operator", () => {
      const filter = {
        field: "views",
        operator: "lte",
        value: 100,
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        views: { [Op.lte]: 100 },
      });
    });

    it("should handle gt operator", () => {
      const filter = {
        field: "views",
        operator: "gt",
        value: 100,
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        views: { [Op.gt]: 100 },
      });
    });

    it("should handle gte operator", () => {
      const filter = {
        field: "views",
        operator: "gte",
        value: 100,
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        views: { [Op.gte]: 100 },
      });
    });

    it("should handle contains operator", () => {
      const filter = {
        field: "title",
        operator: "contains",
        value: "test",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.like]: "%test%" },
      });
    });

    it("should handle containsCaseInsensitive operator", () => {
      const filter = {
        field: "title",
        operator: "containsCaseInsensitive",
        value: "test",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.iLike]: "%test%" },
      });
    });

    it("should handle startsWith operator", () => {
      const filter = {
        field: "title",
        operator: "startsWith",
        value: "test",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.like]: "test%" },
      });
    });

    it("should handle startsWithCaseInsensitive operator", () => {
      const filter = {
        field: "title",
        operator: "startsWithCaseInsensitive",
        value: "test",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.iLike]: "test%" },
      });
    });

    it("should handle endsWith operator", () => {
      const filter = {
        field: "title",
        operator: "endsWith",
        value: "test",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.like]: "%test" },
      });
    });

    it("should handle endsWithCaseInsensitive operator", () => {
      const filter = {
        field: "title",
        operator: "endsWithCaseInsensitive",
        value: "test",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.iLike]: "%test" },
      });
    });

    it("should handle in operator", () => {
      const filter = {
        field: "status",
        operator: "in",
        value: ["draft", "published"],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        status: { [Op.in]: ["draft", "published"] },
      });
    });

    it("should handle notIn operator", () => {
      const filter = {
        field: "status",
        operator: "notIn",
        value: ["archived", "deleted"],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        status: { [Op.notIn]: ["archived", "deleted"] },
      });
    });

    it("should handle isNull operator", () => {
      const filter = {
        field: "deletedAt",
        operator: "isNull",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        deletedAt: { [Op.is]: null },
      });
    });

    it("should handle isNotNull operator", () => {
      const filter = {
        field: "publishedAt",
        operator: "isNotNull",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        publishedAt: { [Op.not]: null },
      });
    });

    it("should throw error for unsupported operator", () => {
      const filter = {
        field: "title",
        operator: "unsupported",
        value: "test",
      };

      expect(() => buildWhere(filter)).toThrow(
        "Unsupported operator: unsupported"
      );
    });
  });

  describe("filter groups", () => {
    it("should handle AND group with multiple conditions", () => {
      const filter = {
        operator: "AND" as const,
        filters: [
          {
            field: "status",
            operator: "eq",
            value: "published",
          },
          {
            field: "views",
            operator: "gt",
            value: 100,
          },
        ],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        [Op.and]: [
          { status: { [Op.eq]: "published" } },
          { views: { [Op.gt]: 100 } },
        ],
      });
    });

    it("should handle OR group with multiple conditions", () => {
      const filter = {
        operator: "OR" as const,
        filters: [
          {
            field: "title",
            operator: "contains",
            value: "test",
          },
          {
            field: "content",
            operator: "contains",
            value: "test",
          },
        ],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        [Op.or]: [
          { title: { [Op.like]: "%test%" } },
          { content: { [Op.like]: "%test%" } },
        ],
      });
    });

    it("should handle nested filter groups", () => {
      const filter = {
        operator: "AND" as const,
        filters: [
          {
            field: "status",
            operator: "eq",
            value: "published",
          },
          {
            operator: "OR" as const,
            filters: [
              {
                field: "title",
                operator: "contains",
                value: "important",
              },
              {
                field: "tags",
                operator: "contains",
                value: "urgent",
              },
            ],
          },
        ],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        [Op.and]: [
          { status: { [Op.eq]: "published" } },
          {
            [Op.or]: [
              { title: { [Op.like]: "%important%" } },
              { tags: { [Op.like]: "%urgent%" } },
            ],
          },
        ],
      });
    });

    it("should handle deeply nested filter groups", () => {
      const filter = {
        operator: "OR" as const,
        filters: [
          {
            operator: "AND" as const,
            filters: [
              {
                field: "status",
                operator: "eq",
                value: "published",
              },
              {
                field: "views",
                operator: "gte",
                value: 1000,
              },
            ],
          },
          {
            operator: "AND" as const,
            filters: [
              {
                field: "featured",
                operator: "eq",
                value: true,
              },
              {
                operator: "OR" as const,
                filters: [
                  {
                    field: "createdAt",
                    operator: "gt",
                    value: new Date("2024-01-01"),
                  },
                  {
                    field: "updatedAt",
                    operator: "gt",
                    value: new Date("2024-01-01"),
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        [Op.or]: [
          {
            [Op.and]: [
              { status: { [Op.eq]: "published" } },
              { views: { [Op.gte]: 1000 } },
            ],
          },
          {
            [Op.and]: [
              { featured: { [Op.eq]: true } },
              {
                [Op.or]: [
                  { createdAt: { [Op.gt]: new Date("2024-01-01") } },
                  { updatedAt: { [Op.gt]: new Date("2024-01-01") } },
                ],
              },
            ],
          },
        ],
      });
    });

    it("should handle single condition in a group", () => {
      const filter = {
        operator: "AND" as const,
        filters: [
          {
            field: "status",
            operator: "eq",
            value: "published",
          },
        ],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        [Op.and]: [{ status: { [Op.eq]: "published" } }],
      });
    });

    it("should handle empty filter groups", () => {
      const filter = {
        operator: "AND" as const,
        filters: [],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        [Op.and]: [],
      });
    });

    it("should handle mixed numeric and string values", () => {
      const filter = {
        operator: "AND" as const,
        filters: [
          {
            field: "price",
            operator: "gte",
            value: 99.99,
          },
          {
            field: "category",
            operator: "eq",
            value: "electronics",
          },
          {
            field: "inStock",
            operator: "eq",
            value: true,
          },
        ],
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        [Op.and]: [
          { price: { [Op.gte]: 99.99 } },
          { category: { [Op.eq]: "electronics" } },
          { inStock: { [Op.eq]: true } },
        ],
      });
    });
  });

  describe("edge cases", () => {
    it("should handle special characters in like operators", () => {
      const filter = {
        field: "title",
        operator: "contains",
        value: "test%_special",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.like]: "%test%_special%" },
      });
    });

    it("should handle empty strings in values", () => {
      const filter = {
        field: "title",
        operator: "eq",
        value: "",
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        title: { [Op.eq]: "" },
      });
    });

    it("should handle null values in eq/neq operators", () => {
      const filterEq = {
        field: "parentId",
        operator: "eq",
        value: null,
      };

      const resultEq = buildWhere(filterEq);

      expect(resultEq).toEqual({
        parentId: { [Op.eq]: null },
      });

      const filterNeq = {
        field: "parentId",
        operator: "neq",
        value: null,
      };

      const resultNeq = buildWhere(filterNeq);

      expect(resultNeq).toEqual({
        parentId: { [Op.ne]: null },
      });
    });

    it("should handle boolean values", () => {
      const filter = {
        field: "isPublished",
        operator: "eq",
        value: false,
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        isPublished: { [Op.eq]: false },
      });
    });

    it("should handle date values", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const filter = {
        field: "createdAt",
        operator: "gte",
        value: date,
      };

      const result = buildWhere(filter);

      expect(result).toEqual({
        createdAt: { [Op.gte]: date },
      });
    });
  });
});
