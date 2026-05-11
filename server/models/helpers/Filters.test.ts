import { Op } from "sequelize";
import { CollectionPermission, StatusFilter } from "@shared/types";
import { buildCollection, buildUser, buildTeam } from "@server/test/factories";
import {
  authorizeFilterFields,
  buildSearchWhere,
  buildWhere,
  collectEqValues,
  dateFromDuration,
  expandDocumentIdInFilter,
  extractTopLevelEqValue,
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

    it("converts a positive duration value on gte to a now()+interval literal", () => {
      const result = buildWhere({
        field: "dueDate",
        operator: "lte",
        value: "P7D",
      }) as Record<string, Record<symbol, { val: string }>>;
      expect(result.dueDate[Op.lte].val).toBe("now() + interval 'P7D'");
    });

    it("converts a negative duration value on gte to a now()-interval literal", () => {
      const result = buildWhere({
        field: "updatedAt",
        operator: "gte",
        value: "-P7D",
      }) as Record<string, Record<symbol, { val: string }>>;
      expect(result.updatedAt[Op.gte].val).toBe("now() - interval 'P7D'");
    });

    it("converts a duration on lt for the older-than case", () => {
      const result = buildWhere({
        field: "updatedAt",
        operator: "lt",
        value: "-P30D",
      }) as Record<string, Record<symbol, { val: string }>>;
      expect(result.updatedAt[Op.lt].val).toBe("now() - interval 'P30D'");
    });

    it("converts a duration on gt for the further-than-future case", () => {
      const result = buildWhere({
        field: "dueDate",
        operator: "gt",
        value: "P1M",
      }) as Record<string, Record<symbol, { val: string }>>;
      expect(result.dueDate[Op.gt].val).toBe("now() + interval 'P1M'");
    });

    it("does not transform a duration-shaped value on eq", () => {
      expect(
        buildWhere({ field: "title", operator: "eq", value: "P1D" })
      ).toEqual({ title: { [Op.eq]: "P1D" } });
    });

    it("does not transform a duration-shaped value on neq", () => {
      expect(
        buildWhere({ field: "title", operator: "neq", value: "P1D" })
      ).toEqual({ title: { [Op.ne]: "P1D" } });
    });

    it("does not transform duration-shaped values inside an in array", () => {
      expect(
        buildWhere({ field: "title", operator: "in", value: ["P1D"] })
      ).toEqual({ title: { [Op.in]: ["P1D"] } });
    });

    it("passes through ISO 8601 datetimes unchanged on gte", () => {
      expect(
        buildWhere({
          field: "createdAt",
          operator: "gte",
          value: "2024-01-01",
        })
      ).toEqual({ createdAt: { [Op.gte]: "2024-01-01" } });
    });

    it("passes through numeric values unchanged on gte", () => {
      expect(
        buildWhere({
          field: "createdAt",
          operator: "gte",
          value: 1700000000,
        })
      ).toEqual({ createdAt: { [Op.gte]: 1700000000 } });
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

    it("maps userId eq to collaboratorIds @> ARRAY[value]", () => {
      expect(
        buildWhere({ field: "userId", operator: "eq", value: "u1" })
      ).toEqual({ collaboratorIds: { [Op.contains]: ["u1"] } });
    });

    it("maps userId in to collaboratorIds @> ARRAY[...values]", () => {
      expect(
        buildWhere({ field: "userId", operator: "in", value: ["a", "b"] })
      ).toEqual({ collaboratorIds: { [Op.contains]: ["a", "b"] } });
    });

    it("rejects userId with a non-eq/in operator", () => {
      expect(() =>
        buildWhere({ field: "userId", operator: "neq", value: "u" })
      ).toThrow();
    });
  });

  describe("dateFromDuration", () => {
    it("returns a now()+interval literal for a positive duration", () => {
      expect(dateFromDuration("P1D").val).toBe("now() + interval 'P1D'");
    });

    it("preserves a multi-unit positive duration verbatim", () => {
      expect(dateFromDuration("P1Y2M3DT4H5M6S").val).toBe(
        "now() + interval 'P1Y2M3DT4H5M6S'"
      );
    });

    it("returns a now()-interval literal for a negative duration", () => {
      expect(dateFromDuration("-P7D").val).toBe("now() - interval 'P7D'");
    });

    it("strips the sign from the magnitude in negative durations", () => {
      expect(dateFromDuration("-PT1H").val).toBe("now() - interval 'PT1H'");
    });

    it.each(["", "P", "P1.5D", "P1D'", "P-1D", "p1d"])(
      "throws on invalid input %j",
      (value) => {
        expect(() => dateFromDuration(value)).toThrow(/Invalid ISO 8601/);
      }
    );
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

  describe("collectEqValues", () => {
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

    it("converts userId / documentId params to eq leaves", () => {
      expect(legacyParamsToFilter({ userId: "u1", documentId: "d1" })).toEqual({
        operator: "AND",
        filters: [
          { field: "userId", operator: "eq", value: "u1" },
          { field: "documentId", operator: "eq", value: "d1" },
        ],
      });
    });

    it("converts dateFilter to an updatedAt gte duration leaf", () => {
      expect(legacyParamsToFilter({ dateFilter: "week" })).toEqual({
        field: "updatedAt",
        operator: "gte",
        value: "-P1W",
      });
    });

    it("converts a single statusFilter entry to its shape", () => {
      expect(
        legacyParamsToFilter({ statusFilter: [StatusFilter.Archived] })
      ).toEqual({ field: "archivedAt", operator: "isNotNull" });
    });

    it("converts multiple statusFilter entries to an OR of shapes", () => {
      expect(
        legacyParamsToFilter({
          statusFilter: [StatusFilter.Published, StatusFilter.Archived],
        })
      ).toEqual({
        operator: "OR",
        filters: [
          {
            operator: "AND",
            filters: [
              { field: "archivedAt", operator: "isNull" },
              { field: "publishedAt", operator: "isNotNull" },
            ],
          },
          { field: "archivedAt", operator: "isNotNull" },
        ],
      });
    });

    it("ANDs collectionId / dateFilter / statusFilter together", () => {
      expect(
        legacyParamsToFilter({
          collectionId: "c",
          dateFilter: "day",
          statusFilter: [StatusFilter.Archived],
        })
      ).toEqual({
        operator: "AND",
        filters: [
          { field: "collectionId", operator: "eq", value: "c" },
          { field: "updatedAt", operator: "gte", value: "-P1D" },
          { field: "archivedAt", operator: "isNotNull" },
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

  describe("buildSearchWhere", () => {
    it("maps userId eq to collaboratorIds @> ARRAY[value]", () => {
      expect(
        buildSearchWhere({ field: "userId", operator: "eq", value: "u1" })
      ).toEqual({ collaboratorIds: { [Op.contains]: ["u1"] } });
    });

    it("maps userId in to collaboratorIds @> ARRAY[...values]", () => {
      expect(
        buildSearchWhere({ field: "userId", operator: "in", value: ["a", "b"] })
      ).toEqual({ collaboratorIds: { [Op.contains]: ["a", "b"] } });
    });

    it("converts collectionId eq via the standard leaf conversion", () => {
      expect(
        buildSearchWhere({ field: "collectionId", operator: "eq", value: "c" })
      ).toEqual({ collectionId: { [Op.eq]: "c" } });
    });

    it("converts an id in leaf (post-documentId expansion)", () => {
      expect(
        buildSearchWhere({ field: "id", operator: "in", value: ["a", "b"] })
      ).toEqual({ id: { [Op.in]: ["a", "b"] } });
    });

    it("converts archivedAt isNotNull", () => {
      expect(
        buildSearchWhere({ field: "archivedAt", operator: "isNotNull" })
      ).toEqual({ archivedAt: { [Op.not]: null } });
    });

    it("converts a published-shape AND group", () => {
      expect(
        buildSearchWhere({
          operator: "AND",
          filters: [
            { field: "archivedAt", operator: "isNull" },
            { field: "publishedAt", operator: "isNotNull" },
          ],
        })
      ).toEqual({
        [Op.and]: [
          { archivedAt: { [Op.is]: null } },
          { publishedAt: { [Op.not]: null } },
        ],
      });
    });

    it("converts an OR group of statuses", () => {
      expect(
        buildSearchWhere({
          operator: "OR",
          filters: [
            { field: "archivedAt", operator: "isNotNull" },
            {
              operator: "AND",
              filters: [
                { field: "archivedAt", operator: "isNull" },
                { field: "publishedAt", operator: "isNotNull" },
              ],
            },
          ],
        })
      ).toEqual({
        [Op.or]: [
          { archivedAt: { [Op.not]: null } },
          {
            [Op.and]: [
              { archivedAt: { [Op.is]: null } },
              { publishedAt: { [Op.not]: null } },
            ],
          },
        ],
      });
    });

    it("converts updatedAt gte with an ISO duration to a literal", () => {
      const result = buildSearchWhere({
        field: "updatedAt",
        operator: "gte",
        value: "-P7D",
      }) as Record<string, Record<symbol, { val: string }>>;
      expect(result.updatedAt[Op.gte].val).toBe("now() - interval 'P7D'");
    });

    it("delegates non-search-specific fields to the standard leaf builder", () => {
      // `title`/`createdAt`/etc. have no search-specific semantics — they
      // map to the underlying column the same way `buildWhere` would.
      expect(
        buildSearchWhere({ field: "title", operator: "contains", value: "x" })
      ).toEqual({ title: { [Op.iLike]: "%x%" } });
    });

    it("rejects userId with a non-eq/in operator", () => {
      expect(() =>
        buildSearchWhere({ field: "userId", operator: "neq", value: "u" })
      ).toThrow();
    });

    it("rejects documentId leaves (must be expanded by the route)", () => {
      expect(() =>
        buildSearchWhere({ field: "documentId", operator: "eq", value: "d" })
      ).toThrow();
    });
  });

  describe("expandDocumentIdInFilter", () => {
    it("replaces a top-level documentId eq leaf with id in", () => {
      expect(
        expandDocumentIdInFilter(
          { field: "documentId", operator: "eq", value: "p" },
          "p",
          ["p", "c1", "c2"]
        )
      ).toEqual({ field: "id", operator: "in", value: ["p", "c1", "c2"] });
    });

    it("replaces a documentId leaf inside an AND group", () => {
      expect(
        expandDocumentIdInFilter(
          {
            operator: "AND",
            filters: [
              { field: "title", operator: "eq", value: "x" },
              { field: "documentId", operator: "eq", value: "p" },
            ],
          },
          "p",
          ["p", "c1"]
        )
      ).toEqual({
        operator: "AND",
        filters: [
          { field: "title", operator: "eq", value: "x" },
          { field: "id", operator: "in", value: ["p", "c1"] },
        ],
      });
    });

    it("leaves non-matching leaves untouched", () => {
      const filter = {
        operator: "AND" as const,
        filters: [
          { field: "title" as const, operator: "eq" as const, value: "x" },
          {
            field: "documentId" as const,
            operator: "eq" as const,
            value: "different",
          },
        ],
      };
      expect(expandDocumentIdInFilter(filter, "p", ["p"])).toEqual(filter);
    });

    describe("authorizeFilterFields", () => {
      it("must authorize EVERY collectionId referenced anywhere in the tree", async () => {
        // If the helper only checked top-level leaves, an attacker could
        // smuggle an unauthorized collectionId into a nested OR.
        const team = await buildTeam();
        const ownerA = await buildUser({ teamId: team.id });
        const ownerB = await buildUser({ teamId: team.id });
        const reader = await buildUser({ teamId: team.id });
        const accessible = await buildCollection({
          teamId: team.id,
          userId: reader.id,
          permission: CollectionPermission.Read,
        });
        const inaccessible = await buildCollection({
          teamId: team.id,
          userId: ownerA.id,
          permission: null,
        });

        // Buried in an OR group with sibling fields.
        const filter = {
          operator: "OR" as const,
          filters: [
            {
              field: "collectionId",
              operator: "eq" as const,
              value: accessible.id,
            },
            {
              field: "collectionId",
              operator: "eq" as const,
              value: inaccessible.id,
            },
          ],
        };

        await expect(
          authorizeFilterFields(reader, filter)
        ).rejects.toBeDefined();
        // Suppress unused var lint
        expect(ownerB.id).toBeDefined();
      });

      it("must authorize collectionId inside a deeply nested AND-OR chain", async () => {
        const team = await buildTeam();
        const ownerA = await buildUser({ teamId: team.id });
        const reader = await buildUser({ teamId: team.id });
        const inaccessible = await buildCollection({
          teamId: team.id,
          userId: ownerA.id,
          permission: null,
        });

        const filter = {
          operator: "AND" as const,
          filters: [
            { field: "title", operator: "contains" as const, value: "x" },
            {
              operator: "OR" as const,
              filters: [
                {
                  operator: "AND" as const,
                  filters: [
                    {
                      field: "collectionId",
                      operator: "eq" as const,
                      value: inaccessible.id,
                    },
                  ],
                },
              ],
            },
          ],
        };
        await expect(
          authorizeFilterFields(reader, filter)
        ).rejects.toBeDefined();
      });

      it("must authorize every entry of an in[] list, even with one entry accessible", async () => {
        const team = await buildTeam();
        const ownerA = await buildUser({ teamId: team.id });
        const reader = await buildUser({ teamId: team.id });
        const accessible = await buildCollection({
          teamId: team.id,
          userId: reader.id,
          permission: CollectionPermission.Read,
        });
        const inaccessible = await buildCollection({
          teamId: team.id,
          userId: ownerA.id,
          permission: null,
        });
        const filter = {
          field: "collectionId" as const,
          operator: "in" as const,
          value: [accessible.id, inaccessible.id],
        };
        await expect(
          authorizeFilterFields(reader, filter)
        ).rejects.toBeDefined();
      });

      it("must NOT authorize values that are smuggled through non-eq/in operators today", () => {
        // The current contract only authorizes via collectEqValues which
        // ignores neq/contains/etc — so those operators must NOT be
        // available as a way to scope queries to specific collections.
        // The default visibility predicate in documents.list is the safety
        // net that catches anything those operators try to expand into.
        for (const op of [
          "neq",
          "contains",
          "startsWith",
          "endsWith",
          "notIn",
          "isNull",
          "isNotNull",
        ] as const) {
          const leaf =
            op === "isNull" || op === "isNotNull"
              ? { field: "collectionId", operator: op }
              : op === "notIn"
                ? { field: "collectionId", operator: op, value: ["x"] }
                : { field: "collectionId", operator: op, value: "x" };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expect(collectEqValues(leaf as any, "collectionId")).toEqual([]);
        }
      });
    });

    describe("extractTopLevelEqValue / parent-doc membership escape", () => {
      it("must NOT extract a parentDocumentId nested inside an OR group", () => {
        // The membership escape drops collection scoping when this returns
        // a value. An OR-nested parentDocumentId must not trigger it.
        const filter = {
          operator: "OR" as const,
          filters: [
            {
              field: "parentDocumentId",
              operator: "eq" as const,
              value: "p1",
            },
            { field: "title", operator: "contains" as const, value: "x" },
          ],
        };
        expect(
          extractTopLevelEqValue(filter, "parentDocumentId")
        ).toBeUndefined();
      });

      it("must NOT extract a parentDocumentId from a nested AND inside the root AND", () => {
        // Only true top-level AND children count. Nested groups must not be
        // recursed into.
        const filter = {
          operator: "AND" as const,
          filters: [
            { field: "title", operator: "contains" as const, value: "x" },
            {
              operator: "AND" as const,
              filters: [
                {
                  field: "parentDocumentId",
                  operator: "eq" as const,
                  value: "p1",
                },
              ],
            },
          ],
        };
        expect(
          extractTopLevelEqValue(filter, "parentDocumentId")
        ).toBeUndefined();
      });

      it("must extract a parentDocumentId at the root or in a one-leaf top-level AND", () => {
        expect(
          extractTopLevelEqValue(
            {
              field: "parentDocumentId",
              operator: "eq",
              value: "p1",
            },
            "parentDocumentId"
          )
        ).toBe("p1");
        expect(
          extractTopLevelEqValue(
            {
              operator: "AND",
              filters: [
                { field: "title", operator: "contains", value: "x" },
                { field: "parentDocumentId", operator: "eq", value: "p1" },
              ],
            },
            "parentDocumentId"
          )
        ).toBe("p1");
      });

      it("must NOT extract a parentDocumentId when more than one leaf references the field", () => {
        // Ambiguous: two `eq` leaves on parentDocumentId (caller likely
        // meant in[] but used a duplicated leaf instead). The escape must
        // not engage with an ambiguous target.
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
    });

    describe("buildWhere LIKE escaping", () => {
      it("must escape backslashes in contains values", () => {
        // Without escaping, `\%` would itself be interpreted as a literal
        // `%` after PostgreSQL parses the LIKE pattern.
        expect(
          buildWhere({
            field: "title",
            operator: "contains",
            value: "a\\b",
          })
        ).toEqual({ title: { [Op.iLike]: "%a\\\\b%" } });
      });

      it("must escape underscores so they cannot match arbitrary chars", () => {
        expect(
          buildWhere({
            field: "title",
            operator: "startsWith",
            value: "a_b",
          })
        ).toEqual({ title: { [Op.iLike]: "a\\_b%" } });
      });
    });

    describe("dateFromDuration SQL safety", () => {
      it("must throw on inputs containing SQL quote characters", () => {
        expect(() => dateFromDuration("P1D' OR 1=1 --")).toThrow();
      });

      it("must throw on inputs containing whitespace", () => {
        expect(() => dateFromDuration("P 1D")).toThrow();
      });

      it("must throw on inputs with disallowed characters", () => {
        for (const value of [
          "P1D;DROP",
          "P1D-",
          "P1D--",
          "P1D/*",
          "P1D)",
          "1D",
          "PT",
          "P",
          "",
          "P1.5D",
        ]) {
          expect(() => dateFromDuration(value)).toThrow();
        }
      });
    });

    describe("hasFieldInFilter", () => {
      it("walks recursively across both AND and OR groups", () => {
        const filter = {
          operator: "AND" as const,
          filters: [
            {
              operator: "OR" as const,
              filters: [
                {
                  field: "archivedAt",
                  operator: "isNotNull" as const,
                },
                { field: "title", operator: "contains" as const, value: "x" },
              ],
            },
          ],
        };
        // The current handler uses this to disable the default
        // archivedAt-is-null exclusion. That's defensible (a referenced
        // archivedAt clause is the caller's intent), but the test pins the
        // contract so future refactors don't silently change it.
        expect(hasFieldInFilter(filter, "archivedAt")).toBe(true);
      });
    });

    describe("mapFilterFields", () => {
      it("does not mutate the input filter tree", () => {
        const original = {
          operator: "AND" as const,
          filters: [
            { field: "userId", operator: "eq" as const, value: "u1" },
            {
              operator: "OR" as const,
              filters: [
                { field: "documentId", operator: "eq" as const, value: "d1" },
              ],
            },
          ],
        };
        const snapshot = JSON.parse(JSON.stringify(original));
        mapFilterFields(original, { userId: "createdById", documentId: "id" });
        expect(original).toEqual(snapshot);
      });
    });
  });
});
