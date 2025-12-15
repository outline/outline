import { z } from "zod";

/**
 * Factory to create a strongly-typed filter schema for a given entity.
 *
 * Example:
 * const UserFields = z.enum(["id", "createdAt", "email", "status"]);
 * const UserFilterSchema = createFilterSchema(UserFields);
 */
export function builderFilterSchema<Fields extends [string, ...string[]]>(
  fieldsEnum: z.ZodEnum<Fields>
) {
  const ComparisonOperator = z.enum([
    "eq",
    "neq",
    "lt",
    "lte",
    "gt",
    "gte",
    "contains",
    "containsCaseInsensitive",
    "startsWith",
    "startsWithCaseInsensitive",
    "endsWith",
    "endsWithCaseInsensitive",
    "in",
    "notIn",
    "isNull",
    "isNotNull",
  ]);

  const LogicalOperator = z.enum(["AND", "OR"]);

  const FilterValue = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.date(),
    z.array(z.string()),
    z.array(z.number()),
  ]);

  const FilterCondition = z.object({
    field: fieldsEnum,
    operator: ComparisonOperator,
    value: FilterValue.optional(), // omitted for isNull / isNotNull
  });

  const FilterGroup: z.ZodType<{
    operator: z.infer<typeof LogicalOperator>;
    filters: Array<z.infer<typeof FilterCondition> | any>;
  }> = z.lazy(() =>
    z.object({
      operator: LogicalOperator,
      filters: z.array(z.union([FilterCondition, FilterGroup])).min(1),
    })
  );

  const FilterSchema = z.union([FilterCondition, FilterGroup]);

  return {
    FilterSchema,
    FilterCondition,
    FilterGroup,
    ComparisonOperator,
    LogicalOperator,
  };
}
