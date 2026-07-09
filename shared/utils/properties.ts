import { isUUID } from "validator";
import type {
  DataView,
  DocumentProperties,
  FilterCondition,
  FilterGroup,
  Property,
  PropertyValue,
} from "../types";
import { DataViewType, FilterOperator, PropertyType } from "../types";
import { DataViewValidation, PropertyValidation } from "../validations";

/**
 * Validates a collection data schema, the array of property definitions that
 * turns a collection into a database.
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

    default:
      return undefined;
  }
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
  if (property.config !== undefined && !isPlainObject(property.config)) {
    throw new Error("Property config must be an object");
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
