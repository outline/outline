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
}
