import type { Literal } from "sequelize/types/utils";
import { Sequelize } from "sequelize";
import type {
  DataViewSort,
  FilterCondition,
  FilterGroup,
  Property,
} from "@shared/types";
import { FilterOperator, PropertyType } from "@shared/types";
import { ValidationError } from "@server/errors";
import { sequelize } from "@server/storage/database";

/**
 * Translates database view filters and sorts into SQL over the
 * `documents.properties` JSONB column. All property ids are resolved against
 * the collection's data schema and all values are escaped, so the generated
 * SQL is safe to embed as literals.
 */
export class PropertyQueryHelper {
  /**
   * Builds a SQL condition for the given filter group.
   *
   * @param filter The filter group from the view query
   * @param schema The collection's data schema
   * @param column The qualified properties column reference
   * @returns A Sequelize literal for use in a where clause, or undefined when
   *   the filter contains no conditions.
   * @throws ValidationError when the filter references unknown properties or
   *   uses an operator that is invalid for the property type.
   */
  public static buildFilter(
    filter: FilterGroup,
    schema: Property[],
    column = `"document"."properties"`
  ): Literal | undefined {
    const sql = this.groupToSql(filter, schema, column);
    return sql ? Sequelize.literal(sql) : undefined;
  }

  /**
   * Builds SQL order expressions for the given property sorts. Values of the
   * wrong runtime type sort as NULL (last), so a schema type change cannot
   * cause cast errors.
   *
   * @param sorts The property sorts from the view query
   * @param schema The collection's data schema
   * @param column The qualified properties column reference
   * @returns An array of Sequelize literals for use in an order clause.
   * @throws ValidationError when a sort references an unknown property.
   */
  public static buildOrder(
    sorts: DataViewSort[],
    schema: Property[],
    column = `"document"."properties"`
  ): Literal[] {
    return sorts.map((sort) => {
      const property = this.getProperty(schema, sort.propertyId);
      const direction = sort.direction === "desc" ? "DESC" : "ASC";
      return Sequelize.literal(
        `${this.sortExpression(property, column)} ${direction} NULLS LAST`
      );
    });
  }

  private static groupToSql(
    filter: FilterGroup,
    schema: Property[],
    column: string,
    depth = 1
  ): string | undefined {
    if (depth > 5) {
      throw ValidationError("Filters are nested too deeply");
    }

    const parts = filter.conditions
      .map((condition) =>
        "conjunction" in condition
          ? this.groupToSql(condition, schema, column, depth + 1)
          : this.conditionToSql(condition, schema, column)
      )
      .filter((part): part is string => part !== undefined);

    if (parts.length === 0) {
      return undefined;
    }

    const conjunction = filter.conjunction === "or" ? " OR " : " AND ";
    return `(${parts.join(conjunction)})`;
  }

  private static conditionToSql(
    condition: FilterCondition,
    schema: Property[],
    column: string
  ): string {
    const property = this.getProperty(schema, condition.propertyId);
    const key = this.escape(property.id);
    const text = `(${column} #>> ARRAY[${key}])`;

    switch (condition.operator) {
      case FilterOperator.Is:
        return this.containmentSql(property, condition.value, column);

      case FilterOperator.IsNot:
        return `NOT ${this.containmentSql(property, condition.value, column)}`;

      case FilterOperator.Contains:
        return this.containsSql(property, condition.value, column, text);

      case FilterOperator.DoesNotContain:
        return `NOT ${this.containsSql(property, condition.value, column, text)}`;

      case FilterOperator.IsEmpty:
        return `NOT (${column} ? ${key})`;

      case FilterOperator.IsNotEmpty:
        return `(${column} ? ${key})`;

      case FilterOperator.Gt:
      case FilterOperator.Gte:
      case FilterOperator.Lt:
      case FilterOperator.Lte: {
        const value = condition.value;
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw ValidationError(
            `Filter value for "${property.name}" must be a number`
          );
        }
        const operator = {
          [FilterOperator.Gt]: ">",
          [FilterOperator.Gte]: ">=",
          [FilterOperator.Lt]: "<",
          [FilterOperator.Lte]: "<=",
        }[condition.operator];
        return `(jsonb_typeof(${column} -> ${key}) = 'number' AND ${text}::numeric ${operator} ${this.escape(value)})`;
      }

      case FilterOperator.Before:
      case FilterOperator.After:
      case FilterOperator.On: {
        const value = condition.value;
        if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
          throw ValidationError(
            `Filter value for "${property.name}" must be a date`
          );
        }
        const escaped = this.escape(value);
        const guard = `jsonb_typeof(${column} -> ${key}) = 'string'`;
        switch (condition.operator) {
          case FilterOperator.Before:
            return `(${guard} AND ${text}::timestamptz < ${escaped}::timestamptz)`;
          case FilterOperator.After:
            return `(${guard} AND ${text}::timestamptz > ${escaped}::timestamptz)`;
          default:
            return `(${guard} AND ${text}::timestamptz::date = ${escaped}::timestamptz::date)`;
        }
      }

      default:
        throw ValidationError("Unknown filter operator");
    }
  }

  private static containmentSql(
    property: Property,
    value: unknown,
    column: string
  ): string {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw ValidationError(
        `Filter value for "${property.name}" must be a scalar`
      );
    }
    const json = JSON.stringify({ [property.id]: value });
    return `(${column} @> ${this.escape(json)}::jsonb)`;
  }

  private static containsSql(
    property: Property,
    value: unknown,
    column: string,
    text: string
  ): string {
    if (property.type === PropertyType.MultiSelect) {
      if (typeof value !== "string") {
        throw ValidationError(
          `Filter value for "${property.name}" must be an option id`
        );
      }
      const json = JSON.stringify({ [property.id]: [value] });
      return `(${column} @> ${this.escape(json)}::jsonb)`;
    }

    if (typeof value !== "string" || value === "") {
      throw ValidationError(
        `Filter value for "${property.name}" must be a string`
      );
    }
    const pattern = `%${value.replace(/([%_\\])/g, "\\$1")}%`;
    return `(${text} ILIKE ${this.escape(pattern)})`;
  }

  private static sortExpression(property: Property, column: string): string {
    const key = this.escape(property.id);
    const text = `(${column} #>> ARRAY[${key}])`;

    switch (property.type) {
      case PropertyType.Number:
        return `(CASE WHEN jsonb_typeof(${column} -> ${key}) = 'number' THEN ${text}::numeric END)`;

      case PropertyType.Select: {
        // sort by option display name rather than the stored option id
        const options = property.options ?? [];
        if (options.length === 0) {
          return text;
        }
        const cases = options
          .map(
            (option) =>
              `WHEN ${text} = ${this.escape(option.id)} THEN ${this.escape(option.name)}`
          )
          .join(" ");
        return `(CASE ${cases} ELSE ${text} END)`;
      }

      default:
        // text, url, person, checkbox and ISO dates all sort correctly as text
        return text;
    }
  }

  private static getProperty(schema: Property[], propertyId: string): Property {
    const property = schema.find((item) => item.id === propertyId);
    if (!property) {
      throw ValidationError(`Unknown property id "${propertyId}"`);
    }
    return property;
  }

  private static escape(value: string | number): string {
    return sequelize.escape(value);
  }
}
