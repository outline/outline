import { z } from "zod";
import type { DateFilter } from "../types";
import { isISO8601Duration } from "../utils/date";
import { FilterValidation } from "../validations";

/** The ISO 8601 duration each coarse date filter corresponds to. */
export const DURATION_BY_DATE_FILTER: Record<DateFilter, string> = {
  day: "-P1D",
  week: "-P1W",
  month: "-P1M",
  year: "-P1Y",
};

/**
 * How a filter condition compares a field against its value. The `*Strict`
 * variants are case-sensitive; `isNull` and `isNotNull` take no value.
 */
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

/** How the members of a filter group are combined. */
export const LogicalOperator = z.enum(["AND", "OR"]);
export type LogicalOperator = z.infer<typeof LogicalOperator>;

/**
 * The value a filter condition compares against. Filters travel over the wire
 * as JSON, so the value is limited to JSON types.
 */
export const FilterValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
]);
export type FilterValue = z.infer<typeof FilterValue>;

/**
 * A single comparison against one field, the leaf of a filter expression.
 *
 * Declared as a type alias rather than an interface so that TypeScript infers
 * an index signature and a filter stays assignable to a JSON request body.
 *
 * @typeParam F the field names the condition may reference.
 */
export type FilterCondition<F extends string = string> = {
  /** The field being compared. */
  field: F;

  /** How the field is compared against the value. */
  operator: ComparisonOperator;

  /** The value to compare against, omitted for `isNull` and `isNotNull`. */
  value?: FilterValue;
};

/**
 * A set of filter expressions combined under one logical operator. Groups may
 * contain other groups, forming a tree.
 *
 * Declared as a type alias rather than an interface so that TypeScript infers
 * an index signature and a filter stays assignable to a JSON request body.
 *
 * @typeParam F the field names the nested conditions may reference.
 */
export type FilterGroup<F extends string = string> = {
  /** How the nested expressions are combined. */
  operator: LogicalOperator;

  /** The nested expressions, each a condition or a further group. */
  filters: Array<FilterCondition<F> | FilterGroup<F>>;
};

/**
 * A filter expression: either a single condition or a group of them.
 *
 * @typeParam F the field names the expression may reference.
 */
export type Filter<F extends string = string> =
  | FilterCondition<F>
  | FilterGroup<F>;

/** The column type a filterable field maps to, used to validate values. */
export type FieldKind = "uuid" | "string" | "number" | "boolean" | "date";

/**
 * A filterable field definition: either just its column type, or an object
 * that additionally restricts which operators the field supports and which
 * values it accepts.
 */
export type FieldSpec =
  | FieldKind
  | {
      kind: FieldKind;
      operators?: readonly ComparisonOperator[];
      values?: readonly string[];
    };

const uuidSchema = z.uuid();

// Accept a full ISO 8601 datetime (with `Z` or an offset) or a bare ISO date.
const dateSchema = z.union([z.iso.datetime({ offset: true }), z.iso.date()]);

/** Operators for which range comparisons (and relative durations) apply. */
export const RANGE_OPERATORS = new Set<ComparisonOperator>([
  "gt",
  "gte",
  "lt",
  "lte",
]);

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

function countNodes(filter: Filter): number {
  if (isGroup(filter)) {
    return filter.filters.reduce((total, f) => total + countNodes(f), 1);
  }
  return 1;
}

/**
 * Build a zod schema for a typed filter DSL constrained to a field allowlist.
 *
 * Each field maps to a column type ({@link FieldKind}) so that values are
 * validated against the field at the input layer, returning a clean 400 rather
 * than letting malformed input (e.g. a non-uuid id, an invalid date) reach the
 * database. A field may also restrict its supported operators or its accepted
 * values ({@link FieldSpec}) so that combinations the query layer cannot
 * execute are rejected here as well.
 *
 * @param fields map of allowed field name to its column type, optionally with a restricted operator or value set.
 * @returns FilterSchema for a single expression, and FilterListSchema for the wire-level `filters` array.
 */
export function createFilterSchema<S extends Record<string, FieldSpec>>(
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
      const spec: FieldSpec = fields[field];
      const kind = typeof spec === "string" ? spec : spec.kind;
      const allowedOperators =
        typeof spec === "string" ? undefined : spec.operators;
      const allowedValues = typeof spec === "string" ? undefined : spec.values;
      const isAllowed = (entry: unknown) =>
        typeof entry === "string" && !!allowedValues?.includes(entry);

      if (allowedOperators && !allowedOperators.includes(operator)) {
        ctx.addIssue({
          code: "custom",
          message: `operator '${operator}' is not supported for field '${field}'`,
          path: ["operator"],
        });
        return;
      }

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
          return;
        }
        if (allowedValues && value.some((entry) => !isAllowed(entry))) {
          ctx.addIssue({
            code: "custom",
            message: `value must contain only ${allowedValues.join(", ")} for field '${field}'`,
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
        // it against a uuid/date/enum/etc. column would error at the database.
        if (kind !== "string" || allowedValues) {
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
        return;
      }

      if (allowedValues && !isAllowed(value)) {
        ctx.addIssue({
          code: "custom",
          message: `value must be one of ${allowedValues.join(", ")} for field '${field}'`,
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
        .max(FilterValidation.maxNodes),
    })
  );

  const FilterSchema = z
    .union([FilterConditionSchema, FilterGroupSchema])
    .superRefine((data, ctx) => {
      const filter = data as Filter;
      if (depthOf(filter) > FilterValidation.maxDepth) {
        ctx.addIssue({
          code: "custom",
          message: `filter nesting depth exceeds maximum of ${FilterValidation.maxDepth}`,
        });
      }
      if (countNodes(filter) > FilterValidation.maxNodes) {
        ctx.addIssue({
          code: "custom",
          message: `filter contains more than the maximum of ${FilterValidation.maxNodes} conditions`,
        });
      }
    });

  const FilterListSchema = z
    .array(FilterSchema)
    .min(1)
    .max(FilterValidation.maxNodes)
    .superRefine((filters, ctx) => {
      const total = filters.reduce(
        (sum, filter) => sum + countNodes(filter as Filter),
        0
      );
      if (total > FilterValidation.maxNodes) {
        ctx.addIssue({
          code: "custom",
          message: `filters contain more than the maximum of ${FilterValidation.maxNodes} conditions`,
        });
      }
    });

  return { FilterSchema, FilterListSchema };
}
