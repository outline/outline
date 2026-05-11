import { z } from "zod";
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
 * @param fields list of allowed field names for this entity.
 * @returns the composed FilterSchema along with its FilterCondition / FilterGroup parts.
 */
export function createFilterSchema<F extends readonly [string, ...string[]]>(
  fields: F
) {
  const FieldEnum = z.enum(fields);

  const FilterConditionSchema = z
    .object({
      field: FieldEnum,
      operator: ComparisonOperator,
      value: FilterValue.optional(),
    })
    .superRefine((data, ctx) => {
      const { operator, value } = data;
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

      if (isStringOp && typeof value !== "string") {
        ctx.addIssue({
          code: "custom",
          message: `value must be a string for operator '${operator}'`,
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
