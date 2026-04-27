import { Op, type WhereOptions } from "sequelize";
import type {
  ComparisonOperator,
  Filter,
  FilterCondition,
  FilterGroup,
} from "@shared/helpers/FilterHelper";
import { Collection } from "@server/models";
import type User from "@server/models/User";
import { authorize } from "@server/policies";

const operatorMap: Record<
  ComparisonOperator,
  symbol | { op: symbol; transform?: (value: unknown) => unknown }
> = {
  eq: Op.eq,
  neq: Op.ne,
  lt: Op.lt,
  lte: Op.lte,
  gt: Op.gt,
  gte: Op.gte,
  contains: Op.iLike,
  startsWith: Op.iLike,
  endsWith: Op.iLike,
  in: Op.in,
  notIn: Op.notIn,
  isNull: Op.is,
  isNotNull: Op.not,
};

/** Escape a value for safe use inside a SQL LIKE / iLike pattern. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function isGroup<F extends string>(
  filter: Filter<F>
): filter is FilterGroup<F> {
  return "filters" in filter;
}

function leafToWhere(condition: FilterCondition): Record<string, unknown> {
  const { field, operator, value } = condition;

  switch (operator) {
    case "isNull":
      return { [field]: { [Op.is]: null } };
    case "isNotNull":
      return { [field]: { [Op.not]: null } };
    case "contains":
      return { [field]: { [Op.iLike]: `%${escapeLike(String(value))}%` } };
    case "startsWith":
      return { [field]: { [Op.iLike]: `${escapeLike(String(value))}%` } };
    case "endsWith":
      return { [field]: { [Op.iLike]: `%${escapeLike(String(value))}` } };
    default: {
      const op = operatorMap[operator];
      if (typeof op !== "symbol") {
        throw new Error(`Unhandled filter operator: ${operator}`);
      }
      return { [field]: { [op]: value } };
    }
  }
}

/**
 * Convert a filter DSL expression into a Sequelize WhereOptions clause.
 *
 * @param filter the filter expression to convert.
 * @returns a Sequelize-compatible where clause.
 */
export function buildWhere<M extends object = object>(
  filter: Filter
): WhereOptions<M> {
  if (isGroup(filter)) {
    const subWheres = filter.filters.map((f) => buildWhere<M>(f));
    const op = filter.operator === "AND" ? Op.and : Op.or;
    return { [op]: subWheres } as WhereOptions<M>;
  }
  return leafToWhere(filter) as WhereOptions<M>;
}

/**
 * Recursively check whether a filter references a particular field anywhere in its tree.
 *
 * @param filter the filter to inspect.
 * @param field the field name to look for.
 * @returns true if the field appears in any leaf condition.
 */
export function hasFieldInFilter(filter: Filter, field: string): boolean {
  if (isGroup(filter)) {
    return filter.filters.some((f) => hasFieldInFilter(f, field));
  }
  return filter.field === field;
}

/**
 * Collect all values referenced by `eq` and `in` leaves for a given field.
 *
 * @param filter the filter to inspect.
 * @param field the field name to extract values for.
 * @returns the union of values across matching leaves; empty if none.
 */
export function collectEqValues(filter: Filter, field: string): string[] {
  const out: string[] = [];
  const walk = (f: Filter) => {
    if (isGroup(f)) {
      f.filters.forEach(walk);
      return;
    }
    if (f.field !== field) {
      return;
    }
    if (f.operator === "eq" && f.value !== undefined) {
      out.push(String(f.value));
    } else if (f.operator === "in" && Array.isArray(f.value)) {
      out.push(...f.value.map(String));
    }
  };
  walk(filter);
  return out;
}

/**
 * Whether the filter narrows results to one or more specific collections via `eq` or `in`.
 *
 * Used by the `documents.list` handler to decide if the default `user.collectionIds()`
 * scope should be applied. Other operators (e.g. `neq`, `isNull`) do not constitute
 * an explicit collection target, and the default scope must still be applied.
 *
 * @param filter the filter to inspect.
 * @returns true if collectionId is restricted to specific values via eq/in.
 */
export function hasExplicitCollectionId(filter: Filter): boolean {
  return collectEqValues(filter, "collectionId").length > 0;
}

/**
 * Extract a single top-level eq value for a given field, if present.
 *
 * Only matches when the filter root is either a leaf condition or an AND group
 * containing exactly one matching leaf — used for handling parameters whose
 * semantics only make sense as a single value (e.g. parentDocumentId membership
 * escape, sort=index special case).
 *
 * @param filter the filter to inspect.
 * @param field the field name to extract.
 * @returns the single eq value, or undefined if not unambiguously present.
 */
export function extractTopLevelEqValue(
  filter: Filter,
  field: string
): string | undefined {
  const leaves: FilterCondition[] = isGroup(filter)
    ? filter.operator === "AND"
      ? filter.filters.filter(
          (f): f is FilterCondition => !isGroup(f) && f.field === field
        )
      : []
    : filter.field === field
      ? [filter]
      : [];

  if (leaves.length !== 1) {
    return undefined;
  }
  const leaf = leaves[0];
  if (leaf.operator !== "eq" || leaf.value === undefined) {
    return undefined;
  }
  return String(leaf.value);
}

/**
 * Rename leaf field names according to a mapping.
 *
 * Used to bridge the public API field naming (e.g. `userId`) to the underlying
 * Sequelize column name (e.g. `createdById`) without exposing the column name
 * in the API.
 *
 * @param filter the filter to transform.
 * @param mapping map of source field name to target column name.
 * @returns a new filter with mapped field names; structure preserved.
 */
export function mapFilterFields(
  filter: Filter,
  mapping: Record<string, string>
): Filter {
  if (isGroup(filter)) {
    return {
      operator: filter.operator,
      filters: filter.filters.map((f) => mapFilterFields(f, mapping)),
    };
  }
  const mapped = mapping[filter.field];
  return mapped ? { ...filter, field: mapped } : filter;
}

interface LegacyParams {
  userId?: string;
  collectionId?: string;
  parentDocumentId?: string | null;
}

/**
 * Translate legacy top-level eq-params into an equivalent filter expression.
 *
 * `parentDocumentId === null` becomes an `isNull` leaf (matches root-level
 * documents); a truthy value becomes an `eq` leaf.
 *
 * @param legacy legacy top-level params.
 * @returns the equivalent filter, or undefined if no legacy params were provided.
 */
export function legacyParamsToFilter(legacy: LegacyParams): Filter | undefined {
  const leaves: FilterCondition[] = [];

  if (legacy.userId) {
    leaves.push({ field: "userId", operator: "eq", value: legacy.userId });
  }
  if (legacy.collectionId) {
    leaves.push({
      field: "collectionId",
      operator: "eq",
      value: legacy.collectionId,
    });
  }
  if (legacy.parentDocumentId === null) {
    leaves.push({ field: "parentDocumentId", operator: "isNull" });
  } else if (legacy.parentDocumentId) {
    leaves.push({
      field: "parentDocumentId",
      operator: "eq",
      value: legacy.parentDocumentId,
    });
  }

  if (leaves.length === 0) {
    return undefined;
  }
  if (leaves.length === 1) {
    return leaves[0];
  }
  return { operator: "AND", filters: leaves };
}

/**
 * Re-run authorization for any auth-bearing fields referenced inside a filter.
 *
 * Currently authorizes each `collectionId` value referenced via `eq` or `in`,
 * mirroring the authorize() call the legacy top-level `collectionId` param would
 * have triggered. Throws if any referenced collection is not readable.
 *
 * @param user the current user.
 * @param filter the filter to authorize.
 * @throws if the user lacks read access to any referenced collection.
 */
export async function authorizeFilterFields(
  user: User,
  filter: Filter
): Promise<void> {
  const collectionIds = collectEqValues(filter, "collectionId");
  if (collectionIds.length === 0) {
    return;
  }

  const collections = await Promise.all(
    Array.from(new Set(collectionIds)).map((id) =>
      Collection.findByPk(id, { userId: user.id })
    )
  );

  for (const collection of collections) {
    authorize(user, "readDocument", collection);
  }
}
