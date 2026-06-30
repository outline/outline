import { z } from "zod";
import { isISO8601Duration } from "../utils/date";
import { FilterValidation } from "../validations";

export const ComparisonOperator = z.enum([
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "startsWith",
  "endsWith",
  "containsStrict",
  "startsWithStrict",
  "endsWithStrict",
  "in",
  "notIn",
  "isNull",
  "isNotNull",
]);
export type ComparisonOperator = z.infer<typeof ComparisonOperator>;

export const LogicalOperator = z.enum(["AND", "OR"]);
export type LogicalOperator = z.infer<typeof LogicalOperator>;

export const FilterValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.date(),
  z.array(z.string()),
  z.array(z.number()),
]);
export type FilterValue = z.infer<typeof FilterValue>;

export interface FilterCondition<F extends string = string> {
  field: F;
  operator: ComparisonOperator;
  value?: FilterValue;
}

export interface FilterGroup<F extends string = string> {
  operator: LogicalOperator;
  filters: Array<FilterCondition<F> | FilterGroup<F>>;
}

export type Filter<F extends string = string> =
  | FilterCondition<F>
  | FilterGroup<F>;

/** The column type a filterable field maps to, used to validate values. */
export type FieldKind = "uuid" | "string" | "number" | "boolean" | "date";

const uuidSchema = z.uuid();

// Accept a full ISO 8601 datetime (with `Z` or an offset) or a bare ISO date.
const dateSchema = z.union([z.iso.datetime({ offset: true }), z.iso.date()]);

// Relative durations (e.g. `-P1D`) are only meaningful for range comparisons.
const RANGE_OPERATORS = new Set<ComparisonOperator>(["gt", "gte", "lt", "lte"]);

/**
 * Check whether a single scalar value is compatible with a field's column type.
 *
 * @param kind the field's column type.
 * @param value the candidate value.
 * @param operator the operator the value is used with.
 * @returns true if the value is a valid input for the field.
 */
function scalarMatchesKind(
  kind: FieldKind,
  value: unknown,
  operator: ComparisonOperator
): boolean {
  switch (kind) {
    case "uuid":
      return uuidSchema.safeParse(value).success;
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "date":
      if (typeof value !== "string") {
        return false;
      }
      if (RANGE_OPERATORS.has(operator) && isISO8601Duration(value)) {
        return true;
      }
      return dateSchema.safeParse(value).success;
    default:
      return false;
  }
}

function isGroup(filter: Filter): filter is FilterGroup {
  return "filters" in filter;
}

function depthOf(filter: Filter): number {
  if (isGroup(filter)) {
    return 1 + Math.max(...filter.filters.map(depthOf));
  }
  return 1;
}

/**
 * Build a zod schema for a typed filter DSL constrained to a field allowlist.
 *
 * Each field maps to a column type ({@link FieldKind}) so that values are
 * validated against the field at the input layer, returning a clean 400 rather
 * than letting malformed input (e.g. a non-uuid id, an invalid date) reach the
 * database.
 *
 * @param fields map of allowed field name to its column type.
 * @returns the composed FilterSchema along with its FilterCondition / FilterGroup parts.
 */
export function createFilterSchema<S extends Record<string, FieldKind>>(
  fields: S
) {
  const FieldEnum = z.enum(
    Object.keys(fields) as [
      Extract<keyof S, string>,
      ...Extract<keyof S, string>[],
    ]
  );

  const FilterConditionSchema = z
    .object({
      field: FieldEnum,
      operator: ComparisonOperator,
      value: FilterValue.optional(),
    })
    .superRefine((data, ctx) => {
      const { field, operator, value } = data;
      const kind = fields[field];
      const isArrayOp = operator === "in" || operator === "notIn";
      const isNullOp = operator === "isNull" || operator === "isNotNull";
      const isStringOp =
        operator === "contains" ||
        operator === "startsWith" ||
        operator === "endsWith" ||
        operator === "containsStrict" ||
        operator === "startsWithStrict" ||
        operator === "endsWithStrict";

      if (isNullOp) {
        if (value !== undefined) {
          ctx.addIssue({
            code: "custom",
            message: `value must not be provided for operator '${operator}'`,
            path: ["value"],
          });
        }
        return;
      }

      if (value === undefined) {
        ctx.addIssue({
          code: "custom",
          message: `value is required for operator '${operator}'`,
          path: ["value"],
        });
        return;
      }

      if (isArrayOp) {
        if (!Array.isArray(value) || value.length === 0) {
          ctx.addIssue({
            code: "custom",
            message: `value must be a non-empty array for operator '${operator}'`,
            path: ["value"],
          });
          return;
        }
        if (value.length > FilterValidation.maxInValues) {
          ctx.addIssue({
            code: "custom",
            message: `value must contain at most ${FilterValidation.maxInValues} entries for operator '${operator}'`,
            path: ["value"],
          });
        }
        if (value.some((entry) => !scalarMatchesKind(kind, entry, operator))) {
          ctx.addIssue({
            code: "custom",
            message: `value must contain only valid ${kind} entries for field '${field}'`,
            path: ["value"],
          });
        }
        return;
      }

      if (Array.isArray(value)) {
        ctx.addIssue({
          code: "custom",
          message: `value must not be an array for operator '${operator}'`,
          path: ["value"],
        });
        return;
      }

      if (isStringOp) {
        if (typeof value !== "string") {
          ctx.addIssue({
            code: "custom",
            message: `value must be a string for operator '${operator}'`,
            path: ["value"],
          });
          return;
        }
        // Pattern matching (iLike/like) only applies to text columns; running
        // it against a uuid/date/etc. column would error at the database.
        if (kind !== "string") {
          ctx.addIssue({
            code: "custom",
            message: `operator '${operator}' is only valid for text fields, not field '${field}'`,
            path: ["operator"],
          });
        }
        return;
      }

      if (!scalarMatchesKind(kind, value, operator)) {
        ctx.addIssue({
          code: "custom",
          message: `value must be a valid ${kind} for field '${field}'`,
          path: ["value"],
        });
      }
    });

  type Condition = z.infer<typeof FilterConditionSchema>;
  type Group = {
    operator: LogicalOperator;
    filters: Array<Condition | Group>;
  };

  const FilterGroupSchema: z.ZodType<Group> = z.lazy(() =>
    z.object({
      operator: LogicalOperator,
      filters: z
        .array(z.union([FilterConditionSchema, FilterGroupSchema]))
        .min(1)
        .max(FilterValidation.maxFiltersPerGroup),
    })
  );

  const FilterSchema = z
    .union([FilterConditionSchema, FilterGroupSchema])
    .superRefine((data, ctx) => {
      if (depthOf(data as Filter) > FilterValidation.maxDepth) {
        ctx.addIssue({
          code: "custom",
          message: `filter nesting depth exceeds maximum of ${FilterValidation.maxDepth}`,
        });
      }
    });

  return {
    FilterCondition: FilterConditionSchema,
    FilterGroup: FilterGroupSchema,
    FilterSchema,
  };
}
