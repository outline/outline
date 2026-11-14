import i18next from "i18next";
import { StatusFilter } from "@shared/types";
import type { SearchFilter } from "./searchFilters";
import {
  createSearchFilters,
  getFilterValues,
  isFilterSet,
} from "./searchFilters";

const filters = createSearchFilters(i18next.t);

function getFilter(id: string): SearchFilter {
  const filter = filters.find((item) => item.id === id);
  if (!filter) {
    throw new Error(`Missing filter ${id}`);
  }
  return filter;
}

describe("searchFilters", () => {
  it("has a unique id for each filter", () => {
    const ids = filters.map((filter) => filter.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to default values when the URL does not set the filter", () => {
    const status = getFilter("statusFilter");
    const params = new URLSearchParams();

    expect(isFilterSet(status, params)).toBe(false);
    expect(getFilterValues(status, params)).toEqual([
      StatusFilter.Published,
      StatusFilter.Draft,
    ]);
  });

  it("reads repeated and comma separated values from the URL", () => {
    const status = getFilter("statusFilter");

    expect(
      getFilterValues(
        status,
        new URLSearchParams("statusFilter=archived&statusFilter=draft")
      )
    ).toEqual([StatusFilter.Archived, StatusFilter.Draft]);
    expect(
      getFilterValues(
        status,
        new URLSearchParams("statusFilter=archived,draft")
      )
    ).toEqual([StatusFilter.Archived, StatusFilter.Draft]);
  });

  it("reads toggle filters from truthy URL values", () => {
    const title = getFilter("titleFilter");

    expect(isFilterSet(title, new URLSearchParams("titleFilter=true"))).toBe(
      true
    );
    expect(isFilterSet(title, new URLSearchParams("titleFilter=false"))).toBe(
      false
    );
    expect(getFilterValues(title, new URLSearchParams())).toEqual([]);
  });

  it("matches one or many values for id filters", () => {
    const createdBy = getFilter("createdById");

    expect(createdBy.toFilter?.([])).toBeUndefined();
    expect(createdBy.toFilter?.(["a"])).toEqual({
      field: "createdById",
      operator: "eq",
      value: "a",
    });
    expect(createdBy.toFilter?.(["a", "b"])).toEqual({
      field: "createdById",
      operator: "in",
      value: ["a", "b"],
    });
  });

  it("converts date presets to a duration on the right field", () => {
    expect(getFilter("dateFilter").toFilter?.(["week"])).toEqual({
      field: "updatedAt",
      operator: "gte",
      value: "-P1W",
    });
    expect(getFilter("createdDateFilter").toFilter?.(["month"])).toEqual({
      field: "createdAt",
      operator: "gte",
      value: "-P1M",
    });
    expect(getFilter("publishedDateFilter").toFilter?.(["day"])).toEqual({
      field: "publishedAt",
      operator: "gte",
      value: "-P1D",
    });
    expect(getFilter("dateFilter").toFilter?.(["unknown"])).toBeUndefined();
  });

  it("combines several statuses with OR", () => {
    const status = getFilter("statusFilter");

    expect(status.toFilter?.([StatusFilter.Archived])).toEqual({
      field: "archivedAt",
      operator: "isNotNull",
    });
    expect(
      status.toFilter?.([StatusFilter.Published, StatusFilter.Draft])
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
        {
          operator: "AND",
          filters: [
            { field: "archivedAt", operator: "isNull" },
            { field: "publishedAt", operator: "isNull" },
          ],
        },
      ],
    });
  });

  it("offers every filter without a query", () => {
    const available = filters.filter(
      (filter) => filter.isAvailable?.({}) ?? true
    );
    expect(available).toEqual(filters);
  });
});
