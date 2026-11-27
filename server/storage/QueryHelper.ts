import type { Model, ModelStatic, WhereOptions } from "sequelize";

/**
 * Helper class for building SQL query fragments.
 */
export class QueryHelper {
  /**
   * Escapes characters that have special meaning in a SQL LIKE pattern (`%`,
   * `_`, and the escape character `\`) so the input matches only literally.
   *
   * @param input the raw input to escape.
   * @return the escaped input, safe to embed in a LIKE or ILIKE pattern.
   */
  public static escapeLike(input: string) {
    return input.replace(/[\\%_]/g, "\\$&");
  }

  /**
   * Builds a SQL LIKE pattern matching values that contain the input, with
   * LIKE wildcards in the input escaped so they match only literally.
   *
   * @param input the raw input to build a pattern from.
   * @return the pattern, for use as a LIKE or ILIKE comparison value.
   */
  public static likeContains(input: string) {
    return `%${QueryHelper.escapeLike(input)}%`;
  }

  /**
   * Renders a Sequelize where condition as SQL, for queries that cannot be
   * written with Sequelize.
   *
   * @param model the model that the condition is for.
   * @param where the where condition.
   * @param table the name or alias of the model's table in the query.
   * @return the SQL condition.
   */
  public static whereToSql<M extends Model>(
    model: ModelStatic<M>,
    where: WhereOptions<M>,
    table: string
  ): string {
    const queryGenerator = model.sequelize?.getQueryInterface()
      .queryGenerator as QueryGeneratorWithWhere<M> | undefined;
    if (!queryGenerator) {
      throw new Error(`${model.name} is not initialized`);
    }
    return queryGenerator.getWhereConditions(where, table, model);
  }
}

/** Sequelize types the query generator as unknown; this narrows to the single
 * method used to build a raw SQL filter fragment. */
interface QueryGeneratorWithWhere<M extends Model> {
  getWhereConditions(
    where: WhereOptions<M>,
    tableName: string,
    factory: ModelStatic<M>
  ): string;
}
