import { Op, WhereOptions } from "sequelize";

const operatorMap: Record<string, symbol> = {
  eq: Op.eq,
  neq: Op.ne,
  lt: Op.lt,
  lte: Op.lte,
  gt: Op.gt,
  gte: Op.gte,
  contains: Op.like,
  containsCaseInsensitive: Op.iLike,
  startsWith: Op.like,
  startsWithCaseInsensitive: Op.iLike,
  endsWith: Op.like,
  endsWithCaseInsensitive: Op.iLike,
  in: Op.in,
  notIn: Op.notIn,
  isNull: Op.is,
  isNotNull: Op.not,
};

function buildCondition(condition: {
  field: string;
  operator: string;
  value?: unknown;
}): WhereOptions {
  const { field, operator, value } = condition;
  const sequelizeOp = operatorMap[operator];

  if (!sequelizeOp) {
    throw new Error(`Unsupported operator: ${operator}`);
  }

  switch (operator) {
    case "contains":
    case "containsCaseInsensitive":
      return { [field]: { [sequelizeOp]: `%${value}%` } };

    case "startsWith":
    case "startsWithCaseInsensitive":
      return { [field]: { [sequelizeOp]: `${value}%` } };

    case "endsWith":
    case "endsWithCaseInsensitive":
      return { [field]: { [sequelizeOp]: `%${value}` } };

    case "isNull":
      return { [field]: { [Op.is]: null } };

    case "isNotNull":
      return { [field]: { [Op.not]: null } };

    default:
      return { [field]: { [sequelizeOp]: value } };
  }
}
type FilterCondition = {
  field: string;
  operator: string;
  value?: unknown;
};

type FilterGroup = {
  operator: "AND" | "OR";
  filters: Array<FilterCondition | FilterGroup>;
};

export function buildWhere(
  filter: FilterCondition | FilterGroup
): WhereOptions {
  if ("field" in filter) {
    return buildCondition(filter);
  }

  const subWheres = filter.filters.map(buildWhere);

  return {
    [filter.operator === "AND" ? Op.and : Op.or]: subWheres,
  };
}
