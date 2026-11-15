import { endOfDay, startOfDay } from "date-fns";
import i18next from "i18next";
import { StatusFilter } from "@shared/types";
import type { SearchFilter, SelectSearchFilter } from "./searchFilters";
import {
  createSearchFilters,
  formatDateRange,
  getApiFilter,
  getDateRange,
  getDateRangeParamChanges,
  getFilterConditions,
  getFilterParamChanges,
  getFilterValues,
  isFilterSet,
  parseKey,
} from "./searchFilters";

const filters = createSearchFilters(i18next.t);

const collectionA = "9f1b8c2e-3a4d-4e5f-8a6b-7c8d9e0f1a2b";
const collectionB = "1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d";

function getFilter(id: string): SearchFilter {
  const filter = filters.find((item) => item.id === id);
  if (!filter) {
    throw new Error(`Missing filter ${id}`);
  }
  return filter;
}

function getSelectFilter(id: string): SelectSearchFilter {
  const filter = getFilter(id);
  if (filter.type !== "select") {
    throw new Error(`Filter ${id} is not a select filter`);
  }
  return filter;
}

function params(search: string) {
  return new URLSearchParams(search);
}

describe("searchFilters", () => {
  it("has a unique id for each filter", () => {
    const ids = filters.map((filter) => filter.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("offers every filter without a query", () => {
    const available = filters.filter(
      (filter) => filter.isAvailable?.({}) ?? true
    );
    expect(available).toEqual(filters);
  });

  describe("parseKey", () => {
    it("reads a bare key as eq", () => {
      expect(parseKey("collectionId")).toEqual({
        field: "collectionId",
        operator: "eq",
      });
    });

    it("splits the field and operator", () => {
      expect(parseKey("updatedAt.gte")).toEqual({
        field: "updatedAt",
        operator: "gte",
      });
    });

    it("rejects an unknown operator", () => {
      expect(parseKey("updatedAt.after")).toBeUndefined();
    });
  });

  describe("getFilterConditions", () => {
    it("reads bare, eq and in keys", () => {
      const collection = getSelectFilter("collectionId");

      expect(
        getFilterConditions(collection, params(`collectionId=${collectionA}`))
      ).toEqual({ eq: [collectionA] });
      expect(
        getFilterConditions(
          collection,
          params(`collectionId.in=${collectionA},${collectionB}`)
        )
      ).toEqual({ in: [collectionA, collectionB] });
    });

    it("drops operators the filter does not allow", () => {
      expect(
        getFilterConditions(
          getSelectFilter("userId"),
          params(`userId.neq=${collectionA}`)
        )
      ).toEqual({});
    });

    it("drops values that are not valid", () => {
      expect(
        getFilterConditions(
          getSelectFilter("collectionId"),
          params("collectionId=not-a-uuid")
        )
      ).toEqual({});
      expect(
        getFilterConditions(
          getSelectFilter("updatedAt"),
          params("updatedAt.gte=yesterday")
        )
      ).toEqual({});
    });

    it("reads date ranges with durations and dates", () => {
      expect(
        getFilterConditions(
          getSelectFilter("createdAt"),
          params("createdAt.gte=2026-03-01&createdAt.lte=2026-04-15")
        )
      ).toEqual({ gte: ["2026-03-01"], lte: ["2026-04-15"] });
    });

    it("reads legacy parameters", () => {
      expect(
        getFilterConditions(
          getSelectFilter("updatedAt"),
          params("dateFilter=week")
        )
      ).toEqual({ gte: ["-P1W"] });
      expect(
        getFilterConditions(
          getSelectFilter("status"),
          params("statusFilter=archived&statusFilter=draft")
        )
      ).toEqual({ in: [StatusFilter.Archived, StatusFilter.Draft] });
      expect(
        getFilterConditions(
          getSelectFilter("status"),
          params("statusFilter=archived,draft")
        )
      ).toEqual({ in: [StatusFilter.Archived, StatusFilter.Draft] });
    });

    it("prefers the current format over a legacy parameter", () => {
      expect(
        getFilterConditions(
          getSelectFilter("updatedAt"),
          params("updatedAt.gte=-P1D&dateFilter=week")
        )
      ).toEqual({ gte: ["-P1D"] });
    });
  });

  describe("getFilterValues", () => {
    it("falls back to default values", () => {
      const status = getFilter("status");

      expect(isFilterSet(status, params(""))).toBe(false);
      expect(getFilterValues(status, params(""))).toEqual([
        StatusFilter.Published,
        StatusFilter.Draft,
      ]);
    });

    it("reads toggle filters, including the legacy parameter", () => {
      const title = getFilter("titleOnly");

      expect(isFilterSet(title, params("titleOnly=true"))).toBe(true);
      expect(isFilterSet(title, params("titleFilter=true"))).toBe(true);
      expect(isFilterSet(title, params("titleOnly=false"))).toBe(false);
    });
  });

  describe("getApiFilter", () => {
    it("matches one or many values", () => {
      const createdBy = getFilter("createdById");

      expect(getApiFilter(createdBy, params(""))).toBeUndefined();
      expect(
        getApiFilter(createdBy, params(`createdById.eq=${collectionA}`))
      ).toEqual({ field: "createdById", operator: "eq", value: collectionA });
      expect(
        getApiFilter(
          createdBy,
          params(`createdById.in=${collectionA},${collectionB}`)
        )
      ).toEqual({
        field: "createdById",
        operator: "in",
        value: [collectionA, collectionB],
      });
    });

    it("supports exclusion", () => {
      expect(
        getApiFilter(
          getFilter("collectionId"),
          params(`collectionId.neq=${collectionA}`)
        )
      ).toEqual({ field: "collectionId", operator: "neq", value: collectionA });
    });

    it("sends a date range as whole local days, combined with AND", () => {
      expect(
        getApiFilter(
          getFilter("publishedAt"),
          params("publishedAt.gte=2026-03-01&publishedAt.lte=2026-04-15")
        )
      ).toEqual({
        operator: "AND",
        filters: [
          {
            field: "publishedAt",
            operator: "lte",
            value: endOfDay(new Date(2026, 3, 15)).toISOString(),
          },
          {
            field: "publishedAt",
            operator: "gte",
            value: startOfDay(new Date(2026, 2, 1)).toISOString(),
          },
        ],
      });
    });

    it("sends durations and full timestamps without change", () => {
      expect(
        getApiFilter(getFilter("updatedAt"), params("updatedAt.gte=-P1W"))
      ).toEqual({ field: "updatedAt", operator: "gte", value: "-P1W" });
      expect(
        getApiFilter(
          getFilter("updatedAt"),
          params("updatedAt.lt=2026-03-01T10:00:00Z")
        )
      ).toEqual({
        field: "updatedAt",
        operator: "lt",
        value: "2026-03-01T10:00:00Z",
      });
    });

    it("combines default statuses with OR", () => {
      expect(getApiFilter(getFilter("status"), params(""))).toEqual({
        operator: "OR",
        filters: [
          {
            operator: "AND",
            filters: [
              { field: "archivedAt", operator: "isNull" },
              { field: "publishedAt", operator: "isNotNull" },
            ],
          },
          {
            operator: "AND",
            filters: [
              { field: "archivedAt", operator: "isNull" },
              { field: "publishedAt", operator: "isNull" },
            ],
          },
        ],
      });
      expect(
        getApiFilter(getFilter("status"), params("status.eq=archived"))
      ).toEqual({ field: "archivedAt", operator: "isNotNull" });
    });

    it("adds no condition for toggle filters", () => {
      expect(
        getApiFilter(getFilter("titleOnly"), params("titleOnly=true"))
      ).toBeUndefined();
    });
  });

  describe("getFilterParamChanges", () => {
    it("writes one value as eq and many as in", () => {
      const collection = getFilter("collectionId");

      expect(
        getFilterParamChanges(collection, [collectionA], params(""))
      ).toEqual({ "collectionId.eq": collectionA });
      expect(
        getFilterParamChanges(
          collection,
          [collectionA, collectionB],
          params(`collectionId.eq=${collectionA}`)
        )
      ).toEqual({
        "collectionId.eq": undefined,
        "collectionId.in": [collectionA, collectionB],
      });
    });

    it("writes dates as a lower bound and clears the legacy parameter", () => {
      expect(
        getFilterParamChanges(
          getFilter("updatedAt"),
          ["-P1M"],
          params("dateFilter=week")
        )
      ).toEqual({ dateFilter: undefined, "updatedAt.gte": "-P1M" });
    });

    it("clears every key of a removed filter", () => {
      expect(
        getFilterParamChanges(
          getFilter("createdAt"),
          undefined,
          params("createdAt.gte=2026-03-01&createdAt.lte=2026-04-15&q=x")
        )
      ).toEqual({ "createdAt.gte": undefined, "createdAt.lte": undefined });
    });

    it("round trips through the URL", () => {
      const status = getFilter("status");
      const changes = getFilterParamChanges(
        status,
        [StatusFilter.Archived, StatusFilter.Draft],
        params("")
      );
      const next = new URLSearchParams();
      for (const [key, value] of Object.entries(changes)) {
        if (value !== undefined) {
          next.set(key, Array.isArray(value) ? value.join(",") : value);
        }
      }

      expect(getFilterValues(status, next)).toEqual([
        StatusFilter.Archived,
        StatusFilter.Draft,
      ]);
    });

    it("writes toggles and clears the legacy parameter", () => {
      expect(
        getFilterParamChanges(
          getFilter("titleOnly"),
          ["true"],
          params("titleFilter=true")
        )
      ).toEqual({ titleFilter: undefined, titleOnly: "true" });
    });
  });

  describe("date ranges", () => {
    it("reads a custom range and ignores presets", () => {
      const updated = getFilter("updatedAt");

      expect(
        getDateRange(
          updated,
          params("updatedAt.gte=2026-03-01&updatedAt.lte=2026-04-15")
        )
      ).toEqual({ from: "2026-03-01", to: "2026-04-15" });
      expect(
        getDateRange(updated, params("updatedAt.gte=-P1W"))
      ).toBeUndefined();
      expect(
        getDateRange(getFilter("collectionId"), params(""))
      ).toBeUndefined();
    });

    it("replaces a preset with a range", () => {
      expect(
        getDateRangeParamChanges(
          getFilter("updatedAt"),
          { from: "2026-03-01", to: "2026-04-15" },
          params("updatedAt.gte=-P1W&dateFilter=week")
        )
      ).toEqual({
        dateFilter: undefined,
        "updatedAt.gte": "2026-03-01",
        "updatedAt.lte": "2026-04-15",
      });
    });

    it("labels ranges with one bound", () => {
      expect(formatDateRange({ from: "2026-03-01" }, i18next.t)).toMatch(
        /^From /
      );
      expect(formatDateRange({ to: "2026-03-01" }, i18next.t)).toMatch(
        /^Until /
      );
      expect(formatDateRange({ from: "bad" }, i18next.t)).toBeUndefined();
    });
  });
});
