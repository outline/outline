import { isUUID } from "validator";
import type {
  DataView,
  DataViewColumn,
  DocumentProperties,
  FilterCondition,
  FilterGroup,
  Property,
  PropertyConfig,
  PropertyOption,
  PropertyValue,
} from "../types";
import {
  DataViewType,
  FilterOperator,
  PropertyType,
  RollupAggregation,
  SummaryAggregation,
} from "../types";
import { DataViewValidation, PropertyValidation } from "../validations";

/**
 * Validates a database's data schema, the array of property definitions that
 * describes the columns of the database.
 *
 * @param value the value to validate.
 * @throws Error if the value is not a valid array of property definitions.
 */
export function validateDataSchema(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new Error("dataSchema must be an array of properties");
  }
  if (value.length > PropertyValidation.maxProperties) {
    throw new Error(
      `dataSchema must contain ${PropertyValidation.maxProperties} or fewer properties`
    );
  }

  const ids = new Set<string>();
  const names = new Set<string>();

  for (const property of value) {
    validateProperty(property);
    if (ids.has(property.id)) {
      throw new Error(`Duplicate property id "${property.id}"`);
    }
    const normalizedName = property.name.trim().toLowerCase();
    if (names.has(normalizedName)) {
      throw new Error(`Duplicate property name "${property.name}"`);
    }
    ids.add(property.id);
    names.add(normalizedName);
  }

  // rollups must aggregate across a relation property in the same schema
  for (const property of value as Property[]) {
    if (property.type !== PropertyType.Rollup) {
      continue;
    }
    const relation = (value as Property[]).find(
      (item) => item.id === property.config?.relationPropertyId
    );
    if (!relation || relation.type !== PropertyType.Relation) {
      throw new Error(
        `Rollup property "${property.name}" must reference a relation property in the same schema`
      );
    }
  }
}

/**
 * Validates an array of saved database views.
 *
 * @param value the value to validate.
 * @param schema the data schema the views reference, if available — when
 *   provided, property references in the views are checked against it.
 * @throws Error if the value is not a valid array of views.
 */
export function validateDataViews(
  value: unknown,
  schema?: Property[] | null
): void {
  if (!Array.isArray(value)) {
    throw new Error("views must be an array");
  }
  if (value.length > DataViewValidation.maxViews) {
    throw new Error(
      `views must contain ${DataViewValidation.maxViews} or fewer views`
    );
  }

  const ids = new Set<string>();
  for (const view of value) {
    validateDataView(view, schema);
    if (ids.has(view.id)) {
      throw new Error(`Duplicate view id "${view.id}"`);
    }
    ids.add(view.id);
  }
}

/**
 * Coerces a document's property values against a data schema. Unknown keys
 * and values that cannot be coerced to the property's type are dropped, and
 * null values are removed (null means "unset").
 *
 * @param value the raw properties value, e.g. from user input or import.
 * @param schema the collection's data schema to validate against; when
 *   null or undefined no properties are kept.
 * @returns the coerced property values keyed by property id.
 */
export function coerceDocumentProperties(
  value: unknown,
  schema: Property[] | null | undefined
): DocumentProperties {
  const result: DocumentProperties = {};

  if (!isPlainObject(value) || !schema) {
    return result;
  }

  for (const property of schema) {
    if (!(property.id in value)) {
      continue;
    }
    const coerced = coercePropertyValue(property, value[property.id]);
    if (coerced !== undefined) {
      result[property.id] = coerced;
    }
  }

  return result;
}

/**
 * Coerces a single value to the type of the given property definition.
 *
 * @param property the property definition.
 * @param value the raw value to coerce.
 * @returns the coerced value, or undefined if the value cannot be represented
 *   as the property's type (callers should drop the key).
 */
export function coercePropertyValue(
  property: Property,
  value: unknown
): PropertyValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  switch (property.type) {
    case PropertyType.Text: {
      if (typeof value === "string") {
        return value.slice(0, PropertyValidation.maxValueLength);
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      return undefined;
    }

    case PropertyType.Number: {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    }

    case PropertyType.Checkbox: {
      if (typeof value === "boolean") {
        return value;
      }
      if (value === "true" || value === "false") {
        return value === "true";
      }
      return undefined;
    }

    case PropertyType.Select: {
      if (typeof value !== "string") {
        return undefined;
      }
      return optionIds(property).has(value) ? value : undefined;
    }

    case PropertyType.MultiSelect: {
      const input = typeof value === "string" ? [value] : value;
      if (!Array.isArray(input)) {
        return undefined;
      }
      const known = optionIds(property);
      const values = input.filter(
        (item): item is string => typeof item === "string" && known.has(item)
      );
      return values.length > 0 ? Array.from(new Set(values)) : undefined;
    }

    case PropertyType.Date: {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        return undefined;
      }
      return value;
    }

    case PropertyType.Url: {
      if (typeof value !== "string" || value.trim() === "") {
        return undefined;
      }
      return value.slice(0, PropertyValidation.maxValueLength);
    }

    case PropertyType.Person: {
      return typeof value === "string" && isUUID(value) ? value : undefined;
    }

    case PropertyType.Rollup:
      // rollup values are computed at query time and never stored
      return undefined;

    case PropertyType.Relation: {
      const input = typeof value === "string" ? [value] : value;
      if (!Array.isArray(input)) {
        return undefined;
      }
      const limit =
        property.config?.allowMultiple === false
          ? 1
          : PropertyValidation.maxRelations;
      const ids = Array.from(
        new Set(
          input.filter(
            (item): item is string => typeof item === "string" && isUUID(item)
          )
        )
      ).slice(0, limit);
      return ids.length > 0 ? ids : undefined;
    }

    default:
      return undefined;
  }
}

/**
 * A bucket of items grouped by one option of a property, as rendered by a
 * board column or a grouped list section.
 */
export type PropertyGroup<T> = {
  /** The option this bucket represents, or null for the "no value" bucket. */
  option: PropertyOption | null;
  /** The items whose group value resolves to this bucket, in input order. */
  items: T[];
};

/**
 * Recursively strips every condition referencing a property from a filter
 * group, so removing a property cannot leave a view filtering on it.
 *
 * @param filter the filter group to strip.
 * @param propertyId the id of the property to remove references to.
 * @returns the filter group, or undefined when no conditions remain.
 */
export function removeFilterReferences(
  filter: FilterGroup,
  propertyId: string
): FilterGroup | undefined {
  const conditions = filter.conditions
    .map((condition) => {
      if ("conjunction" in condition) {
        return removeFilterReferences(condition, propertyId);
      }
      return condition.propertyId === propertyId ? undefined : condition;
    })
    .filter(
      (condition): condition is FilterCondition | FilterGroup =>
        condition !== undefined
    );

  return conditions.length > 0 ? { ...filter, conditions } : undefined;
}

/** Summaries that count rows, and so apply to every property type. */
const countingAggregations = [
  SummaryAggregation.Count,
  SummaryAggregation.Filled,
  SummaryAggregation.Empty,
  SummaryAggregation.Unique,
];

/** Summaries that reduce numeric values, and so apply only to numbers. */
const numericAggregations = [
  SummaryAggregation.Sum,
  SummaryAggregation.Avg,
  SummaryAggregation.Min,
  SummaryAggregation.Max,
];

/**
 * Returns the column summaries available for a property. Every property can be
 * counted; only numbers can be summed or averaged.
 *
 * @param property the property definition.
 * @returns the aggregations the property supports, in display order.
 */
export function summaryAggregationsForProperty(
  property: Property
): SummaryAggregation[] {
  if (property.type === PropertyType.Rollup) {
    // rollups are computed per page at read time, so there is no single query
    // that can aggregate them across the whole filtered set
    return [];
  }
  if (property.type === PropertyType.Number) {
    return [...countingAggregations, ...numericAggregations];
  }
  if (
    property.type === PropertyType.MultiSelect ||
    property.type === PropertyType.Relation
  ) {
    // these hold a list per row, so a distinct count would count combinations
    // rather than values — an unhelpful number, so it is not offered
    return countingAggregations.filter(
      (aggregation) => aggregation !== SummaryAggregation.Unique
    );
  }
  return countingAggregations;
}

/**
 * Returns whether a summary produces a count of rows rather than a reduction
 * of the property's values — used to format the result for display.
 *
 * @param aggregation the summary aggregation.
 * @returns true when the result is a row count.
 */
export function isCountingAggregation(
  aggregation: SummaryAggregation
): boolean {
  return countingAggregations.includes(aggregation);
}

/**
 * Returns whether a property can be used to group rows, e.g. as the column
 * source of a board view.
 *
 * @param property the property definition.
 * @returns true when the property type supports grouping.
 */
export function isGroupableProperty(property: Property): boolean {
  return (
    property.type === PropertyType.Select ||
    property.type === PropertyType.MultiSelect
  );
}

/**
 * Resolves the option id a value groups under for the given property.
 * MultiSelect values group by their first option only.
 *
 * @param property the property definition to group by.
 * @param value the document's value for the property.
 * @returns the option id, or null when the value is empty or references no
 *   known option.
 */
export function groupOptionIdForValue(
  property: Property,
  value: PropertyValue | undefined
): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") {
    return null;
  }
  return optionIds(property).has(candidate) ? candidate : null;
}

/**
 * Buckets items by their value for a groupable property. The result contains
 * the "no value" bucket first, followed by one bucket per option in the
 * property's option order — including empty buckets, so board columns are
 * stable regardless of data.
 *
 * @param items the items to group.
 * @param property the property definition to group by.
 * @param getValue accessor returning an item's value for the property.
 * @returns the ordered group buckets.
 */
export function groupByProperty<T>(
  items: T[],
  property: Property,
  getValue: (item: T) => PropertyValue | undefined
): PropertyGroup<T>[] {
  const options = property.options ?? [];
  const buckets = new Map<string | null, PropertyGroup<T>>();
  buckets.set(null, { option: null, items: [] });
  for (const option of options) {
    buckets.set(option.id, { option, items: [] });
  }

  for (const item of items) {
    const optionId = groupOptionIdForValue(property, getValue(item));
    buckets.get(optionId)?.items.push(item);
  }

  return Array.from(buckets.values());
}

/**
 * Resolves every property of a schema in the order the given view arranges
 * them. A view's columns define the order; properties the view has no column
 * entry for — a property added to the schema after the view was created —
 * follow in schema order.
 *
 * @param schema the database's data schema.
 * @param view the view whose column config applies, if any.
 * @returns all schema properties, in the view's order.
 */
export function orderedPropertiesForView(
  schema: Property[],
  view?: DataView | null
): Property[] {
  if (!view?.columns.length) {
    return schema;
  }
  const byId = new Map(schema.map((property) => [property.id, property]));
  const ordered: Property[] = [];
  const seen = new Set<string>();

  for (const column of view.columns) {
    const property = byId.get(column.propertyId);
    if (property && !seen.has(property.id)) {
      seen.add(property.id);
      ordered.push(property);
    }
  }
  for (const property of schema) {
    if (!seen.has(property.id)) {
      ordered.push(property);
    }
  }

  return ordered;
}

/**
 * Resolves the properties visible in a view, in the view's column order. A
 * view's columns act as visibility overrides: properties explicitly marked
 * `visible: false` are hidden, and every other schema property — including
 * ones the view has no column entry for — is visible.
 *
 * @param schema the database's data schema.
 * @param view the view whose column config applies, if any.
 * @returns the visible properties in the view's order.
 */
export function visiblePropertiesForView(
  schema: Property[],
  view?: DataView | null
): Property[] {
  if (!view?.columns.length) {
    return schema;
  }
  const hidden = new Set(
    view.columns
      .filter((column) => !column.visible)
      .map((column) => column.propertyId)
  );
  return orderedPropertiesForView(schema, view).filter(
    (property) => !hidden.has(property.id)
  );
}

/**
 * Builds a complete column list for a view: one entry per schema property, in
 * the view's current order, preserving each column's existing settings. Used
 * before writing a reordered column list so the stored order is unambiguous.
 *
 * @param schema the database's data schema.
 * @param view the view to normalize the columns of, if any.
 * @returns a column entry for every property in the schema.
 */
export function normalizedColumnsForView(
  schema: Property[],
  view?: DataView | null
): DataViewColumn[] {
  const existing = new Map(
    (view?.columns ?? []).map((column) => [column.propertyId, column])
  );
  return orderedPropertiesForView(schema, view).map(
    (property) =>
      existing.get(property.id) ?? { propertyId: property.id, visible: true }
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionIds(property: Property): Set<string> {
  return new Set((property.options ?? []).map((option) => option.id));
}

function validateProperty(property: unknown): asserts property is Property {
  if (!isPlainObject(property)) {
    throw new Error("Each property must be an object");
  }
  if (typeof property.id !== "string" || !isUUID(property.id)) {
    throw new Error("Property id must be a UUID");
  }
  if (
    typeof property.name !== "string" ||
    property.name.trim() === "" ||
    property.name.length > PropertyValidation.maxNameLength
  ) {
    throw new Error(
      `Property name must be a non-empty string of ${PropertyValidation.maxNameLength} or fewer characters`
    );
  }
  if (
    typeof property.type !== "string" ||
    !Object.values(PropertyType).includes(property.type as PropertyType)
  ) {
    throw new Error(`Unknown property type "${String(property.type)}"`);
  }
  if (property.options !== undefined) {
    validateOptions(property.options);
  }
  if (property.config !== undefined) {
    if (!isPlainObject(property.config)) {
      throw new Error("Property config must be an object");
    }
    for (const key of [
      "targetDatabaseId",
      "inversePropertyId",
      "limitToViewId",
    ] as const) {
      const value = property.config[key];
      if (
        value !== undefined &&
        (typeof value !== "string" || !isUUID(value))
      ) {
        throw new Error(`Property config ${key} must be a UUID`);
      }
    }
    if (
      property.config.allowMultiple !== undefined &&
      typeof property.config.allowMultiple !== "boolean"
    ) {
      throw new Error("Property config allowMultiple must be a boolean");
    }
  }

  if ((property.type as PropertyType) === PropertyType.Relation) {
    const config = property.config as PropertyConfig | undefined;
    if (!config?.targetDatabaseId) {
      throw new Error(
        `Relation property "${property.name}" must reference a target database`
      );
    }
  }

  if ((property.type as PropertyType) === PropertyType.Rollup) {
    validateRollupConfig(property as Property);
  }
}

function validateRollupConfig(property: Property) {
  const config = property.config;
  if (!config || typeof config.relationPropertyId !== "string") {
    throw new Error(
      `Rollup property "${property.name}" must reference a relation property`
    );
  }
  if (
    typeof config.rollupAggregation !== "string" ||
    !Object.values(RollupAggregation).includes(config.rollupAggregation)
  ) {
    throw new Error(
      `Rollup property "${property.name}" must define a valid aggregation`
    );
  }
  if (
    config.rollupAggregation !== RollupAggregation.Count &&
    typeof config.rollupPropertyId !== "string"
  ) {
    throw new Error(
      `Rollup property "${property.name}" must reference a property to aggregate`
    );
  }
}

function validateOptions(options: unknown) {
  if (!Array.isArray(options)) {
    throw new Error("Property options must be an array");
  }
  if (options.length > PropertyValidation.maxOptions) {
    throw new Error(
      `Property options must contain ${PropertyValidation.maxOptions} or fewer options`
    );
  }

  const ids = new Set<string>();
  for (const option of options) {
    if (!isPlainObject(option)) {
      throw new Error("Each property option must be an object");
    }
    if (typeof option.id !== "string" || option.id === "") {
      throw new Error("Property option id must be a non-empty string");
    }
    if (
      typeof option.name !== "string" ||
      option.name.trim() === "" ||
      option.name.length > PropertyValidation.maxNameLength
    ) {
      throw new Error(
        `Property option name must be a non-empty string of ${PropertyValidation.maxNameLength} or fewer characters`
      );
    }
    if (option.color !== undefined && typeof option.color !== "string") {
      throw new Error("Property option color must be a string");
    }
    if (ids.has(option.id)) {
      throw new Error(`Duplicate option id "${option.id}"`);
    }
    ids.add(option.id);
  }
}

function validateDataView(
  view: unknown,
  schema?: Property[] | null
): asserts view is DataView {
  if (!isPlainObject(view)) {
    throw new Error("Each view must be an object");
  }
  if (typeof view.id !== "string" || !isUUID(view.id)) {
    throw new Error("View id must be a UUID");
  }
  if (
    typeof view.name !== "string" ||
    view.name.trim() === "" ||
    view.name.length > DataViewValidation.maxNameLength
  ) {
    throw new Error(
      `View name must be a non-empty string of ${DataViewValidation.maxNameLength} or fewer characters`
    );
  }
  if (
    typeof view.type !== "string" ||
    !Object.values(DataViewType).includes(view.type as DataViewType)
  ) {
    throw new Error(`Unknown view type "${String(view.type)}"`);
  }

  const knownPropertyIds = schema
    ? new Set(schema.map((property) => property.id))
    : undefined;

  if (!Array.isArray(view.columns)) {
    throw new Error("View columns must be an array");
  }
  for (const column of view.columns) {
    if (!isPlainObject(column)) {
      throw new Error("Each view column must be an object");
    }
    validatePropertyReference(column.propertyId, knownPropertyIds);
    if (typeof column.visible !== "boolean") {
      throw new Error("View column visible must be a boolean");
    }
    if (
      column.width !== undefined &&
      (typeof column.width !== "number" || column.width <= 0)
    ) {
      throw new Error("View column width must be a positive number");
    }
    if (column.summary !== undefined) {
      if (
        typeof column.summary !== "string" ||
        !Object.values(SummaryAggregation).includes(
          column.summary as SummaryAggregation
        )
      ) {
        throw new Error("Column summary must be a known aggregation");
      }
      const property = schema?.find((item) => item.id === column.propertyId);
      if (
        property &&
        !summaryAggregationsForProperty(property).includes(
          column.summary as SummaryAggregation
        )
      ) {
        throw new Error(
          `Summary "${column.summary}" is not available for property "${property.name}"`
        );
      }
    }
  }

  if (!Array.isArray(view.sorts)) {
    throw new Error("View sorts must be an array");
  }
  for (const sort of view.sorts) {
    if (!isPlainObject(sort)) {
      throw new Error("Each view sort must be an object");
    }
    validatePropertyReference(sort.propertyId, knownPropertyIds);
    if (sort.direction !== "asc" && sort.direction !== "desc") {
      throw new Error("View sort direction must be one of asc,desc");
    }
  }

  if (view.filter !== undefined) {
    validateFilterGroup(view.filter, knownPropertyIds, 1);
  }

  if (view.groupBy !== undefined) {
    validatePropertyReference(view.groupBy, knownPropertyIds);
    if (schema) {
      const property = schema.find((item) => item.id === view.groupBy);
      if (property && !isGroupableProperty(property)) {
        throw new Error(
          `Property "${property.name}" cannot be used to group a view`
        );
      }
    }
  }
}

function validatePropertyReference(
  propertyId: unknown,
  knownPropertyIds?: Set<string>
): asserts propertyId is string {
  if (typeof propertyId !== "string" || propertyId === "") {
    throw new Error("propertyId must be a non-empty string");
  }
  if (knownPropertyIds && !knownPropertyIds.has(propertyId)) {
    throw new Error(`Unknown property id "${propertyId}"`);
  }
}

function validateFilterGroup(
  filter: unknown,
  knownPropertyIds: Set<string> | undefined,
  depth: number
): asserts filter is FilterGroup {
  if (depth > DataViewValidation.maxFilterDepth) {
    throw new Error(
      `Filters must be nested ${DataViewValidation.maxFilterDepth} levels deep or fewer`
    );
  }
  if (!isPlainObject(filter)) {
    throw new Error("Filter must be an object");
  }
  if (filter.conjunction !== "and" && filter.conjunction !== "or") {
    throw new Error("Filter conjunction must be one of and,or");
  }
  if (!Array.isArray(filter.conditions)) {
    throw new Error("Filter conditions must be an array");
  }
  for (const condition of filter.conditions) {
    if (isPlainObject(condition) && "conjunction" in condition) {
      validateFilterGroup(condition, knownPropertyIds, depth + 1);
    } else {
      validateFilterCondition(condition, knownPropertyIds);
    }
  }
}

function validateFilterCondition(
  condition: unknown,
  knownPropertyIds?: Set<string>
): asserts condition is FilterCondition {
  if (!isPlainObject(condition)) {
    throw new Error("Each filter condition must be an object");
  }
  validatePropertyReference(condition.propertyId, knownPropertyIds);
  if (
    typeof condition.operator !== "string" ||
    !Object.values(FilterOperator).includes(
      condition.operator as FilterOperator
    )
  ) {
    throw new Error(`Unknown filter operator "${String(condition.operator)}"`);
  }
}
