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
import {
  ComparisonOperator,
  DURATION_BY_DATE_FILTER,
  scalarMatchesKind,
} from "@shared/helpers/FilterHelper";
import { StatusFilter } from "@shared/types";
import type Document from "~/models/Document";
import { isTruthyQueryValue } from "~/utils/urls";
import type { FilterOptionSource } from "./filterOptions";
import {
  useCollectionOptions,
  useRelativeDateOptions,
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

/** The values of a filter for each operator, as read from the URL. */
export type FilterConditions = Partial<Record<ComparisonOperator, string[]>>;

/** A URL parameter from before the `<field>.<operator>` format. */
export interface LegacyParam {
  /** The name of the URL parameter. */
  param: string;
  /** The operator that the parameter stands for. */
  operator: ComparisonOperator;
  /** Converts a legacy value to the current format, undefined drops it. */
  map?: (value: string) => string | undefined;
}

interface BaseSearchFilter {
  /**
   * Unique identifier and the field name in the URL, which is
   * `<id>.<operator>=<value>`. A bare `<id>=<value>` is read as `eq`.
   */
  id: string;
  /** Name of the filter, shown on the chip and in the add menu. */
  label: string;
  /** Icon shown in the add menu and on the chip when there is no value icon. */
  icon: React.ReactNode;
  /** Pinned filters always show, others are added from the "More" menu. */
  pinned?: boolean;
  /** Whether the filter can be used in the given context, defaults to always. */
  isAvailable?: (context: SearchFilterContext) => boolean;
}

/** A filter where the user picks one or more values from a list. */
export interface SelectSearchFilter extends BaseSearchFilter {
  type: "select";
  /** Operators that the URL may use for this filter, others are dropped. */
  operators: readonly ComparisonOperator[];
  /** Whether a URL value is valid for the operator, others are dropped. */
  isValidValue: (value: string, operator: ComparisonOperator) => boolean;
  /**
   * How a selection is written to the URL: "match" writes one value as `eq`
   * and many as `in`, "after" writes the value as a `gte` lower bound.
   */
  selection: "match" | "after";
  /** Whether more than one value can be selected. */
  multiple?: boolean;
  /** Values that apply when the URL does not include the filter. */
  defaultValues?: string[];
  /** Hook that returns the options to pick from. */
  useOptions: () => FilterOptionSource;
  /** A URL parameter from before the current format, still read. */
  legacy?: LegacyParam;
  /** Builds the API expression, defaults to one condition per operator. */
  toFilter?: (conditions: FilterConditions) => Filter | undefined;
}

/** A filter that is either on or off, and is not an API condition. */
export interface ToggleSearchFilter extends BaseSearchFilter {
  type: "toggle";
  /** A URL parameter from before the current format, still read. */
  legacyParam?: string;
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
      ...matchSelection,
      useOptions: useCollectionOptions,
    },
    {
      type: "select",
      id: "userId",
      label: t("Edited by"),
      icon: <UserIcon />,
      pinned: true,
      ...matchSelection,
      // The API only supports membership checks for these fields.
      operators: ["eq", "in"],
      useOptions: useUserOptions,
    },
    {
      type: "select",
      id: "status",
      label: t("Status"),
      icon: <DoneIcon />,
      pinned: true,
      operators: ["eq", "in"],
      isValidValue: (value) =>
        Object.values<string>(StatusFilter).includes(value),
      selection: "match",
      multiple: true,
      defaultValues: [StatusFilter.Published, StatusFilter.Draft],
      useOptions: useStatusOptions,
      legacy: { param: "statusFilter", operator: "in" },
      toFilter: (conditions) =>
        statusToFilter([...(conditions.eq ?? []), ...(conditions.in ?? [])]),
    },
    {
      type: "select",
      id: "updatedAt",
      label: t("Updated"),
      icon: <CalendarIcon />,
      ...afterSelection,
      legacy: { param: "dateFilter", operator: "gte", map: durationForPreset },
    },
    {
      type: "select",
      id: "createdById",
      label: t("Created by"),
      icon: <EditIcon />,
      ...matchSelection,
      // The API only supports membership checks for these fields.
      operators: ["eq", "in"],
      useOptions: useUserOptions,
    },
    {
      type: "select",
      id: "createdAt",
      label: t("Created"),
      icon: <CalendarIcon />,
      ...afterSelection,
    },
    {
      type: "select",
      id: "publishedAt",
      label: t("Published"),
      icon: <CalendarIcon />,
      ...afterSelection,
    },
    {
      type: "select",
      id: "templateId",
      label: t("Template"),
      icon: <NewDocumentIcon />,
      ...matchSelection,
      useOptions: useTemplateOptions,
    },
    {
      type: "toggle",
      id: "titleOnly",
      label: t("Title only"),
      icon: <TextWrapIcon />,
      legacyParam: "titleFilter",
    },
  ];
}

/**
 * Read the conditions of a filter that the URL sets, from both the
 * `<field>.<operator>` format and any legacy parameter. Keys with an unknown
 * operator, an operator the filter does not allow, or a value that is not
 * valid are dropped.
 *
 * @param filter the filter to read.
 * @param params the URL query parameters.
 * @returns the conditions, empty when the URL does not set the filter.
 */
export function getFilterConditions(
  filter: SelectSearchFilter,
  params: URLSearchParams
): FilterConditions {
  const conditions: FilterConditions = {};
  const add = (operator: ComparisonOperator, raw: string) => {
    if (!filter.operators.includes(operator)) {
      return;
    }
    const values = splitValues(operator, raw).filter((value) =>
      filter.isValidValue(value, operator)
    );
    if (values.length > 0 || isNullOperator(operator)) {
      conditions[operator] = [...(conditions[operator] ?? []), ...values];
    }
  };

  for (const [key, raw] of params.entries()) {
    const parsed = parseKey(key);
    if (parsed?.field === filter.id) {
      add(parsed.operator, raw);
    }
  }

  const { legacy } = filter;
  if (legacy && Object.keys(conditions).length === 0) {
    for (const raw of params.getAll(legacy.param)) {
      for (const value of raw.split(",").filter(Boolean)) {
        const mapped = legacy.map ? legacy.map(value) : value;
        if (mapped) {
          add(legacy.operator, mapped);
        }
      }
    }
  }

  return conditions;
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
    return (
      isTruthyQueryValue(params.get(filter.id)) ||
      (!!filter.legacyParam &&
        isTruthyQueryValue(params.get(filter.legacyParam)))
    );
  }
  return Object.keys(getFilterConditions(filter, params)).length > 0;
}

/**
 * Read the selected values of a filter from the URL, falling back to its
 * defaults. These are the option keys that the chip shows as selected.
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
  const conditions = getFilterConditions(filter, params);
  const values =
    filter.selection === "after"
      ? (conditions.gte ?? [])
      : unique([...(conditions.eq ?? []), ...(conditions.in ?? [])]);
  return values.length > 0 ? values : (filter.defaultValues ?? []);
}

/**
 * Convert the state of a filter in the URL to an API filter expression.
 *
 * @param filter the filter to convert.
 * @param params the URL query parameters.
 * @returns the expression, or undefined when the filter adds no condition.
 */
export function getApiFilter(
  filter: SearchFilter,
  params: URLSearchParams
): Filter | undefined {
  if (filter.type === "toggle") {
    return undefined;
  }
  const set = getFilterConditions(filter, params);
  const conditions =
    Object.keys(set).length > 0 || !filter.defaultValues
      ? set
      : { in: filter.defaultValues };

  return filter.toFilter
    ? filter.toFilter(conditions)
    : conditionsToFilter(filter.id, conditions);
}

/**
 * Build the URL parameter changes that replace the state of a filter. Every
 * key the filter uses now is cleared, including legacy parameters.
 *
 * @param filter the filter to change.
 * @param values the new selected values, or undefined to remove the filter.
 * @param params the current URL query parameters.
 * @returns a map of parameter name to new value, undefined removes the key
 *   and an array is a comma separated list.
 */
export function getFilterParamChanges(
  filter: SearchFilter,
  values: string[] | undefined,
  params: URLSearchParams
): Record<string, string | string[] | undefined> {
  const changes: Record<string, string | string[] | undefined> = {};

  for (const key of params.keys()) {
    if (parseKey(key)?.field === filter.id) {
      changes[key] = undefined;
    }
  }

  if (filter.type === "toggle") {
    if (filter.legacyParam) {
      changes[filter.legacyParam] = undefined;
    }
    changes[filter.id] = values?.length ? TOGGLE_ON : undefined;
    return changes;
  }

  if (filter.legacy) {
    changes[filter.legacy.param] = undefined;
  }
  if (!values?.length) {
    return changes;
  }

  if (filter.selection === "after") {
    changes[`${filter.id}.gte`] = values[0];
  } else if (values.length === 1) {
    changes[`${filter.id}.eq`] = values[0];
  } else {
    changes[`${filter.id}.in`] = values;
  }
  return changes;
}

/**
 * Split a URL key in the `<field>.<operator>` format. A key without an
 * operator is read as `eq`.
 *
 * @param key the URL parameter name.
 * @returns the field and operator, or undefined if the operator is unknown.
 */
export function parseKey(
  key: string
): { field: string; operator: ComparisonOperator } | undefined {
  const dot = key.lastIndexOf(".");
  if (dot === -1) {
    return { field: key, operator: "eq" };
  }
  const operator = ComparisonOperator.safeParse(key.slice(dot + 1));
  return operator.success
    ? { field: key.slice(0, dot), operator: operator.data }
    : undefined;
}

const matchSelection = {
  operators: ["eq", "neq", "in", "notIn"],
  isValidValue: (value: string, operator: ComparisonOperator) =>
    scalarMatchesKind("uuid", value, operator),
  selection: "match",
} as const;

const afterSelection = {
  operators: ["gt", "gte", "lt", "lte"],
  isValidValue: (value: string, operator: ComparisonOperator) =>
    scalarMatchesKind("date", value, operator),
  selection: "after",
  useOptions: useRelativeDateOptions,
} as const;

function durationForPreset(value: string): string | undefined {
  return Object.entries(DURATION_BY_DATE_FILTER).find(
    ([preset]) => preset === value
  )?.[1];
}

function isNullOperator(operator: ComparisonOperator) {
  return operator === "isNull" || operator === "isNotNull";
}

function isListOperator(operator: ComparisonOperator) {
  return operator === "in" || operator === "notIn";
}

function splitValues(operator: ComparisonOperator, raw: string): string[] {
  if (isNullOperator(operator)) {
    return [];
  }
  return isListOperator(operator) ? raw.split(",").filter(Boolean) : [raw];
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function conditionsToFilter(
  field: string,
  conditions: FilterConditions
): Filter | undefined {
  const leaves = ComparisonOperator.options.flatMap((operator): Filter[] => {
    const values = conditions[operator];
    if (!values) {
      return [];
    }
    if (isNullOperator(operator)) {
      return [{ field, operator }];
    }
    if (isListOperator(operator)) {
      return [{ field, operator, value: values }];
    }
    if (values.length > 1 && (operator === "eq" || operator === "neq")) {
      return [
        {
          field,
          operator: operator === "eq" ? "in" : "notIn",
          value: values,
        },
      ];
    }
    return values.map((value) => ({ field, operator, value }));
  });

  if (leaves.length === 0) {
    return undefined;
  }
  return leaves.length === 1 ? leaves[0] : { operator: "AND", filters: leaves };
}

function statusToFilter(values: string[]): Filter | undefined {
  const shapes = unique(values).map((status): Filter => {
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
