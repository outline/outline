import {
  CalendarIcon,
  CollectionIcon,
  DoneIcon,
  EditIcon,
  NewDocumentIcon,
  TextWrapIcon,
  UserIcon,
} from "outline-icons";
import { useMemo } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { Filter } from "@shared/helpers/FilterHelper";
import { DURATION_BY_DATE_FILTER } from "@shared/helpers/FilterHelper";
import type { DateFilter } from "@shared/types";
import { StatusFilter } from "@shared/types";
import type Document from "~/models/Document";
import { isTruthyQueryValue } from "~/utils/urls";
import type { FilterOptionSource } from "./filterOptions";
import {
  useCollectionOptions,
  useDateOptions,
  useStatusOptions,
  useTemplateOptions,
  useUserOptions,
} from "./filterOptions";

/** The state of the search page that controls which filters can show. */
export interface SearchFilterContext {
  /** The search query, if there is one. */
  query?: string;
  /** The document that the search is limited to, if there is one. */
  document?: Document;
}

interface BaseSearchFilter {
  /** Unique identifier, also used as the URL query parameter. */
  id: string;
  /** Name of the filter, shown on the chip and in the add menu. */
  label: string;
  /** Icon shown in the add menu and on the chip when there is no value icon. */
  icon: React.ReactNode;
  /** Pinned filters always show, others are added from the "Filter" menu. */
  pinned?: boolean;
  /** Whether the filter can be used in the given context, defaults to always. */
  isAvailable?: (context: SearchFilterContext) => boolean;
  /** Converts the selected values to an API filter expression. */
  toFilter?: (values: string[]) => Filter | undefined;
}

/** A filter where the user picks one or more values from a list. */
export interface SelectSearchFilter extends BaseSearchFilter {
  type: "select";
  /** Whether more than one value can be selected. */
  multiple?: boolean;
  /** Values that apply when the URL does not include the filter. */
  defaultValues?: string[];
  /** Hook that returns the options to pick from. */
  useOptions: () => FilterOptionSource;
}

/** A filter that is either on or off. */
export interface ToggleSearchFilter extends BaseSearchFilter {
  type: "toggle";
}

/** A filter that can be applied on the search page. */
export type SearchFilter = SelectSearchFilter | ToggleSearchFilter;

/** The URL value that turns a toggle filter on. */
export const TOGGLE_ON = "true";

/**
 * Hook that returns every filter that can be applied on the search page.
 *
 * @returns the search filters.
 */
export function useSearchFilters(): SearchFilter[] {
  const { t } = useTranslation();
  return useMemo(() => createSearchFilters(t), [t]);
}

/**
 * Create every filter that can be applied on the search page, in display
 * order. To add a filter, add a definition to this list.
 *
 * @param t the translation function.
 * @returns the search filters.
 */
export function createSearchFilters(t: TFunction): SearchFilter[] {
  return [
    {
      type: "select",
      id: "collectionId",
      label: t("Collection"),
      icon: <CollectionIcon />,
      pinned: true,
      isAvailable: ({ document }) => !document,
      useOptions: useCollectionOptions,
      toFilter: matchAny("collectionId"),
    },
    {
      type: "select",
      id: "userId",
      label: t("Edited by"),
      icon: <UserIcon />,
      pinned: true,
      useOptions: useUserOptions,
      toFilter: matchAny("userId"),
    },
    {
      type: "select",
      id: "statusFilter",
      label: t("Status"),
      icon: <DoneIcon />,
      pinned: true,
      multiple: true,
      defaultValues: [StatusFilter.Published, StatusFilter.Draft],
      useOptions: useStatusOptions,
      toFilter: statusToFilter,
    },
    {
      type: "select",
      id: "dateFilter",
      label: t("Updated"),
      icon: <CalendarIcon />,
      useOptions: useDateOptions,
      toFilter: withinPast("updatedAt"),
    },
    {
      type: "select",
      id: "createdById",
      label: t("Created by"),
      icon: <EditIcon />,
      useOptions: useUserOptions,
      toFilter: matchAny("createdById"),
    },
    {
      type: "select",
      id: "createdDateFilter",
      label: t("Created"),
      icon: <CalendarIcon />,
      useOptions: useDateOptions,
      toFilter: withinPast("createdAt"),
    },
    {
      type: "select",
      id: "templateId",
      label: t("Template"),
      icon: <NewDocumentIcon />,
      useOptions: useTemplateOptions,
      toFilter: matchAny("templateId"),
    },
    {
      type: "toggle",
      id: "titleFilter",
      label: t("Title only"),
      icon: <TextWrapIcon />,
    },
  ];
}

/**
 * Whether the URL sets a value for the filter, as opposed to the filter using
 * its default values.
 *
 * @param filter the filter to check.
 * @param params the URL query parameters.
 * @returns true if the URL sets the filter.
 */
export function isFilterSet(
  filter: SearchFilter,
  params: URLSearchParams
): boolean {
  if (filter.type === "toggle") {
    return isTruthyQueryValue(params.get(filter.id));
  }
  return readValues(filter, params).length > 0;
}

/**
 * Read the values of a filter from the URL, falling back to its defaults.
 *
 * @param filter the filter to read.
 * @param params the URL query parameters.
 * @returns the selected values.
 */
export function getFilterValues(
  filter: SearchFilter,
  params: URLSearchParams
): string[] {
  if (filter.type === "toggle") {
    return isFilterSet(filter, params) ? [TOGGLE_ON] : [];
  }
  const values = readValues(filter, params);
  return values.length > 0 ? values : (filter.defaultValues ?? []);
}

function readValues(filter: SearchFilter, params: URLSearchParams) {
  return params
    .getAll(filter.id)
    .flatMap((value) => value.split(","))
    .filter(Boolean);
}

function matchAny(field: string) {
  return (values: string[]): Filter | undefined => {
    if (values.length === 0) {
      return undefined;
    }
    return values.length === 1
      ? { field, operator: "eq", value: values[0] }
      : { field, operator: "in", value: values };
  };
}

function withinPast(field: string) {
  return (values: string[]): Filter | undefined => {
    const duration = DURATION_BY_DATE_FILTER[values[0] as DateFilter];
    return duration ? { field, operator: "gte", value: duration } : undefined;
  };
}

function statusToFilter(values: string[]): Filter | undefined {
  const shapes = values.map((status): Filter => {
    if (status === StatusFilter.Archived) {
      return { field: "archivedAt", operator: "isNotNull" };
    }
    return {
      operator: "AND",
      filters: [
        { field: "archivedAt", operator: "isNull" },
        {
          field: "publishedAt",
          operator: status === StatusFilter.Published ? "isNotNull" : "isNull",
        },
      ],
    };
  });

  if (shapes.length === 0) {
    return undefined;
  }
  return shapes.length === 1 ? shapes[0] : { operator: "OR", filters: shapes };
}
