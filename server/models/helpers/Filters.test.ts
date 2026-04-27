import { Op } from "sequelize";
import { CollectionPermission } from "@shared/types";
import { buildCollection, buildUser, buildTeam } from "@server/test/factories";
import {
  authorizeFilterFields,
  buildWhere,
  collectEqValues,
  extractTopLevelEqValue,
  hasExplicitCollectionId,
  hasFieldInFilter,
  legacyParamsToFilter,
  mapFilterFields,
} from "./Filters";

describe("Filters", () => {
  describe("buildWhere", () => {
    it("converts an eq leaf to Op.eq", () => {
      expect(
        buildWhere({ field: "title", operator: "eq", value: "x" })
      ).toEqual({ title: { [Op.eq]: "x" } });
    });

    it("converts contains to a wildcarded iLike with escaped pattern chars", () => {
      expect(
        buildWhere({ field: "title", operator: "contains", value: "50%_a" })
      ).toEqual({ title: { [Op.iLike]: "%50\\%\\_a%" } });
    });

    it("converts startsWith to a trailing-wildcard iLike", () => {
      expect(
        buildWhere({ field: "title", operator: "startsWith", value: "Hi" })
      ).toEqual({ title: { [Op.iLike]: "Hi%" } });
    });

    it("converts endsWith to a leading-wildcard iLike", () => {
      expect(
        buildWhere({ field: "title", operator: "endsWith", value: "End" })
      ).toEqual({ title: { [Op.iLike]: "%End" } });
    });

    it("converts in to Op.in", () => {
      expect(
        buildWhere({ field: "templateId", operator: "in", value: ["a", "b"] })
      ).toEqual({ templateId: { [Op.in]: ["a", "b"] } });
    });

    it("converts neq to Op.ne", () => {
      expect(
        buildWhere({ field: "title", operator: "neq", value: "x" })
      ).toEqual({ title: { [Op.ne]: "x" } });
    });

    it("converts lt/lte/gt/gte", () => {
      expect(
        buildWhere({ field: "createdAt", operator: "lt", value: 1 })
      ).toEqual({ createdAt: { [Op.lt]: 1 } });
      expect(
        buildWhere({ field: "createdAt", operator: "lte", value: 1 })
      ).toEqual({ createdAt: { [Op.lte]: 1 } });
      expect(
        buildWhere({ field: "createdAt", operator: "gt", value: 1 })
      ).toEqual({ createdAt: { [Op.gt]: 1 } });
      expect(
        buildWhere({ field: "createdAt", operator: "gte", value: 1 })
      ).toEqual({ createdAt: { [Op.gte]: 1 } });
    });

    it("converts notIn to Op.notIn", () => {
      expect(
        buildWhere({ field: "templateId", operator: "notIn", value: ["a"] })
      ).toEqual({ templateId: { [Op.notIn]: ["a"] } });
    });

    it("escapes backslashes in like values", () => {
      expect(
        buildWhere({ field: "title", operator: "contains", value: "a\\b" })
      ).toEqual({ title: { [Op.iLike]: "%a\\\\b%" } });
    });

    it("leaves like values without special chars unmodified", () => {
      expect(
        buildWhere({ field: "title", operator: "endsWith", value: "abc" })
      ).toEqual({ title: { [Op.iLike]: "%abc" } });
    });

    it("handles empty-string contains", () => {
      expect(
        buildWhere({ field: "title", operator: "contains", value: "" })
      ).toEqual({ title: { [Op.iLike]: "%%" } });
    });

    it("converts a flat AND group at the root", () => {
      expect(
        buildWhere({
          operator: "AND",
          filters: [
            { field: "title", operator: "eq", value: "x" },
            { field: "templateId", operator: "isNull" },
          ],
        })
      ).toEqual({
        [Op.and]: [
          { title: { [Op.eq]: "x" } },
          { templateId: { [Op.is]: null } },
        ],
      });
    });

    it("converts isNull and isNotNull", () => {
      expect(buildWhere({ field: "publishedAt", operator: "isNull" })).toEqual({
        publishedAt: { [Op.is]: null },
      });
      expect(
        buildWhere({ field: "publishedAt", operator: "isNotNull" })
      ).toEqual({ publishedAt: { [Op.not]: null } });
    });

    it("converts an OR group recursively", () => {
      const result = buildWhere({
        operator: "OR",
        filters: [
          { field: "title", operator: "eq", value: "a" },
          { field: "title", operator: "eq", value: "b" },
        ],
      });
      expect(result).toEqual({
        [Op.or]: [{ title: { [Op.eq]: "a" } }, { title: { [Op.eq]: "b" } }],
      });
    });

    it("converts nested AND-of-OR", () => {
      const result = buildWhere({
        operator: "AND",
        filters: [
          { field: "title", operator: "contains", value: "x" },
          {
            operator: "OR",
            filters: [
              { field: "templateId", operator: "isNull" },
              { field: "templateId", operator: "eq", value: "t1" },
            ],
          },
        ],
      });
      expect(result).toEqual({
        [Op.and]: [
          { title: { [Op.iLike]: "%x%" } },
          {
            [Op.or]: [
              { templateId: { [Op.is]: null } },
              { templateId: { [Op.eq]: "t1" } },
            ],
          },
        ],
      });
    });
  });

  describe("hasFieldInFilter", () => {
    it("finds a leaf field at the root", () => {
      expect(
        hasFieldInFilter(
          { field: "archivedAt", operator: "isNotNull" },
          "archivedAt"
        )
      ).toBe(true);
    });

    it("returns false for a non-matching leaf at the root", () => {
      expect(
        hasFieldInFilter(
          { field: "title", operator: "eq", value: "x" },
          "archivedAt"
        )
      ).toBe(false);
    });

    it("finds a field inside a nested group", () => {
      const filter = {
        operator: "OR" as const,
        filters: [
          { field: "title", operator: "eq" as const, value: "x" },
          {
            operator: "AND" as const,
            filters: [{ field: "archivedAt", operator: "isNotNull" as const }],
          },
        ],
      };
      expect(hasFieldInFilter(filter, "archivedAt")).toBe(true);
      expect(hasFieldInFilter(filter, "createdAt")).toBe(false);
    });
  });

  describe("collectEqValues / hasExplicitCollectionId", () => {
    it("collects eq and in values across the tree", () => {
      const values = collectEqValues(
        {
          operator: "OR",
          filters: [
            { field: "collectionId", operator: "eq", value: "a" },
            { field: "collectionId", operator: "in", value: ["b", "c"] },
            { field: "collectionId", operator: "neq", value: "d" },
          ],
        },
        "collectionId"
      );
      expect(values.sort()).toEqual(["a", "b", "c"]);
    });

    it("hasExplicitCollectionId is false when only non-eq operators reference the field", () => {
      expect(
        hasExplicitCollectionId({
          field: "collectionId",
          operator: "isNotNull",
        })
      ).toBe(false);
    });

    it("hasExplicitCollectionId is true for an eq leaf at the root", () => {
      expect(
        hasExplicitCollectionId({
          field: "collectionId",
          operator: "eq",
          value: "c1",
        })
      ).toBe(true);
    });

    it("collectEqValues returns an empty list when the field is absent", () => {
      expect(
        collectEqValues(
          { field: "title", operator: "eq", value: "x" },
          "collectionId"
        )
      ).toEqual([]);
    });

    it("collectEqValues ignores non-eq/in operators", () => {
      expect(
        collectEqValues(
          {
            operator: "AND",
            filters: [
              { field: "collectionId", operator: "neq", value: "a" },
              { field: "collectionId", operator: "isNull" },
              { field: "collectionId", operator: "notIn", value: ["b"] },
            ],
          },
          "collectionId"
        )
      ).toEqual([]);
    });

    it("collectEqValues finds matches across deeply nested groups", () => {
      const values = collectEqValues(
        {
          operator: "AND",
          filters: [
            {
              operator: "OR",
              filters: [
                { field: "collectionId", operator: "eq", value: "a" },
                {
                  operator: "AND",
                  filters: [
                    { field: "collectionId", operator: "in", value: ["b"] },
                  ],
                },
              ],
            },
          ],
        },
        "collectionId"
      );
      expect(values.sort()).toEqual(["a", "b"]);
    });
  });

  describe("extractTopLevelEqValue", () => {
    it("returns the value for a leaf at the root", () => {
      expect(
        extractTopLevelEqValue(
          { field: "parentDocumentId", operator: "eq", value: "p1" },
          "parentDocumentId"
        )
      ).toBe("p1");
    });

    it("returns the value when wrapped in a single AND group", () => {
      expect(
        extractTopLevelEqValue(
          {
            operator: "AND",
            filters: [
              { field: "title", operator: "eq", value: "x" },
              { field: "parentDocumentId", operator: "eq", value: "p1" },
            ],
          },
          "parentDocumentId"
        )
      ).toBe("p1");
    });

    it("returns undefined inside an OR group", () => {
      expect(
        extractTopLevelEqValue(
          {
            operator: "OR",
            filters: [
              { field: "parentDocumentId", operator: "eq", value: "p1" },
              { field: "parentDocumentId", operator: "eq", value: "p2" },
            ],
          },
          "parentDocumentId"
        )
      ).toBeUndefined();
    });

    it("returns undefined when multiple eq leaves exist", () => {
      expect(
        extractTopLevelEqValue(
          {
            operator: "AND",
            filters: [
              { field: "parentDocumentId", operator: "eq", value: "p1" },
              { field: "parentDocumentId", operator: "eq", value: "p2" },
            ],
          },
          "parentDocumentId"
        )
      ).toBeUndefined();
    });

    it("returns undefined for a non-matching leaf at the root", () => {
      expect(
        extractTopLevelEqValue(
          { field: "title", operator: "eq", value: "x" },
          "parentDocumentId"
        )
      ).toBeUndefined();
    });

    it("returns undefined when the matching leaf uses a non-eq operator", () => {
      expect(
        extractTopLevelEqValue(
          { field: "parentDocumentId", operator: "isNull" },
          "parentDocumentId"
        )
      ).toBeUndefined();
    });

    it("returns undefined when the matching AND leaf uses a non-eq operator", () => {
      expect(
        extractTopLevelEqValue(
          {
            operator: "AND",
            filters: [
              { field: "title", operator: "eq", value: "x" },
              { field: "parentDocumentId", operator: "isNull" },
            ],
          },
          "parentDocumentId"
        )
      ).toBeUndefined();
    });

    it("returns undefined when an AND group has no matching leaves", () => {
      expect(
        extractTopLevelEqValue(
          {
            operator: "AND",
            filters: [{ field: "title", operator: "eq", value: "x" }],
          },
          "parentDocumentId"
        )
      ).toBeUndefined();
    });

    it("does not recurse into nested groups within AND", () => {
      expect(
        extractTopLevelEqValue(
          {
            operator: "AND",
            filters: [
              {
                operator: "AND",
                filters: [
                  { field: "parentDocumentId", operator: "eq", value: "p1" },
                ],
              },
            ],
          },
          "parentDocumentId"
        )
      ).toBeUndefined();
    });
  });

  describe("mapFilterFields", () => {
    it("renames mapped fields and leaves others alone", () => {
      const result = mapFilterFields(
        {
          operator: "AND",
          filters: [
            { field: "userId", operator: "eq", value: "u1" },
            { field: "title", operator: "eq", value: "x" },
          ],
        },
        { userId: "createdById" }
      );
      expect(result).toEqual({
        operator: "AND",
        filters: [
          { field: "createdById", operator: "eq", value: "u1" },
          { field: "title", operator: "eq", value: "x" },
        ],
      });
    });

    it("returns the same leaf when its field is not in the mapping", () => {
      const leaf = {
        field: "title" as const,
        operator: "eq" as const,
        value: "x",
      };
      expect(mapFilterFields(leaf, { userId: "createdById" })).toBe(leaf);
    });

    it("renames a leaf at the root", () => {
      expect(
        mapFilterFields(
          { field: "userId", operator: "eq", value: "u1" },
          { userId: "createdById" }
        )
      ).toEqual({ field: "createdById", operator: "eq", value: "u1" });
    });

    it("is a no-op when the mapping is empty", () => {
      const leaf = {
        field: "userId" as const,
        operator: "eq" as const,
        value: "u1",
      };
      expect(mapFilterFields(leaf, {})).toBe(leaf);
    });

    it("renames fields inside nested groups", () => {
      const result = mapFilterFields(
        {
          operator: "OR",
          filters: [
            {
              operator: "AND",
              filters: [{ field: "userId", operator: "eq", value: "u1" }],
            },
          ],
        },
        { userId: "createdById" }
      );
      expect(result).toEqual({
        operator: "OR",
        filters: [
          {
            operator: "AND",
            filters: [{ field: "createdById", operator: "eq", value: "u1" }],
          },
        ],
      });
    });
  });

  describe("legacyParamsToFilter", () => {
    it("returns undefined when no legacy params are set", () => {
      expect(legacyParamsToFilter({})).toBeUndefined();
    });

    it("ignores parentDocumentId when undefined (distinct from null)", () => {
      expect(
        legacyParamsToFilter({ parentDocumentId: undefined })
      ).toBeUndefined();
    });

    it("returns a single leaf when only one legacy param is set", () => {
      expect(legacyParamsToFilter({ userId: "u1" })).toEqual({
        field: "userId",
        operator: "eq",
        value: "u1",
      });
    });

    it("converts parentDocumentId === null to isNull", () => {
      expect(legacyParamsToFilter({ parentDocumentId: null })).toEqual({
        field: "parentDocumentId",
        operator: "isNull",
      });
    });

    it("converts a truthy parentDocumentId to an eq leaf", () => {
      expect(legacyParamsToFilter({ parentDocumentId: "p1" })).toEqual({
        field: "parentDocumentId",
        operator: "eq",
        value: "p1",
      });
    });

    it("ANDs all three legacy leaves when multiple are supplied", () => {
      expect(
        legacyParamsToFilter({
          userId: "u1",
          collectionId: "c1",
          parentDocumentId: "p1",
        })
      ).toEqual({
        operator: "AND",
        filters: [
          { field: "userId", operator: "eq", value: "u1" },
          { field: "collectionId", operator: "eq", value: "c1" },
          { field: "parentDocumentId", operator: "eq", value: "p1" },
        ],
      });
    });
  });

  describe("authorizeFilterFields", () => {
    it("is a no-op when the filter does not reference collectionId", async () => {
      const user = await buildUser();
      await expect(
        authorizeFilterFields(user, {
          field: "title",
          operator: "eq",
          value: "x",
        })
      ).resolves.toBeUndefined();
    });

    it("is a no-op when collectionId only appears via non-eq operators", async () => {
      const user = await buildUser();
      await expect(
        authorizeFilterFields(user, {
          field: "collectionId",
          operator: "isNotNull",
        })
      ).resolves.toBeUndefined();
    });

    it("authorizes an eq collectionId the user can read", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      await expect(
        authorizeFilterFields(user, {
          field: "collectionId",
          operator: "eq",
          value: collection.id,
        })
      ).resolves.toBeUndefined();
    });

    it("authorizes every collection in an in-list", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const c1 = await buildCollection({ teamId: team.id });
      const c2 = await buildCollection({ teamId: team.id });
      await expect(
        authorizeFilterFields(user, {
          field: "collectionId",
          operator: "in",
          value: [c1.id, c2.id],
        })
      ).resolves.toBeUndefined();
    });

    it("authorizes collection references buried inside nested groups", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({ teamId: team.id });
      await expect(
        authorizeFilterFields(user, {
          operator: "OR",
          filters: [
            { field: "title", operator: "eq", value: "x" },
            {
              operator: "AND",
              filters: [
                {
                  field: "collectionId",
                  operator: "eq",
                  value: collection.id,
                },
              ],
            },
          ],
        })
      ).resolves.toBeUndefined();
    });

    it("throws when the user cannot read the referenced collection", async () => {
      const team = await buildTeam();
      const owner = await buildUser({ teamId: team.id });
      const outsider = await buildUser({ teamId: team.id });
      const privateCollection = await buildCollection({
        teamId: team.id,
        userId: owner.id,
        permission: null,
      });
      await expect(
        authorizeFilterFields(outsider, {
          field: "collectionId",
          operator: "eq",
          value: privateCollection.id,
        })
      ).rejects.toThrow();
    });

    it("throws when any collection in an in-list is unauthorized", async () => {
      const team = await buildTeam();
      const owner = await buildUser({ teamId: team.id });
      const outsider = await buildUser({ teamId: team.id });
      const accessible = await buildCollection({
        teamId: team.id,
        permission: CollectionPermission.Read,
      });
      const privateCollection = await buildCollection({
        teamId: team.id,
        userId: owner.id,
        permission: null,
      });
      await expect(
        authorizeFilterFields(outsider, {
          field: "collectionId",
          operator: "in",
          value: [accessible.id, privateCollection.id],
        })
      ).rejects.toThrow();
    });
  });
});
