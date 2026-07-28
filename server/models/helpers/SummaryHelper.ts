import type { Transaction, WhereOptions } from "sequelize";
import { Op, Sequelize } from "sequelize";
import type { DataView, DataViewSummaries, Property } from "@shared/types";
import { SummaryAggregation } from "@shared/types";
import { summaryAggregationsForProperty } from "@shared/utils/properties";
import { sequelize } from "@server/storage/database";
import Document from "@server/models/Document";

/**
 * Computes the column footer summaries of a database view.
 *
 * Summaries describe the whole filtered set rather than the loaded page, so
 * they are evaluated as a single aggregate query against the same conditions
 * the row query uses, rather than over the rows already fetched.
 */
export class SummaryHelper {
  /**
   * Computes every summary configured on a view.
   *
   * @param view The view whose column configuration selects the summaries
   * @param schema The data schema of the view's database
   * @param where The row conditions to aggregate over — the same conditions
   *   used to list rows, so the summary matches what the view shows
   * @param options Transaction to read within
   * @returns A map of property id to computed value; null where a summary has
   *   no defined result, such as the average of no rows.
   */
  public static async compute(
    view: DataView,
    schema: Property[],
    where: WhereOptions<Document>,
    options: {
      transaction?: Transaction;
      /** Whether unpublished rows are part of the listing being summarised. */
      includeDrafts?: boolean;
    } = {}
  ): Promise<DataViewSummaries> {
    const summaries: DataViewSummaries = {};

    const columns = view.columns.filter((column) => {
      if (!column.summary) {
        return false;
      }
      const property = schema.find((item) => item.id === column.propertyId);
      return (
        !!property &&
        summaryAggregationsForProperty(property).includes(column.summary)
      );
    });
    if (columns.length === 0) {
      return summaries;
    }

    // the aggregate runs unscoped so the default scope's joins cannot disturb
    // it, which means the row filters that scope would have applied have to be
    // restated here — otherwise a summary would count drafts and templates the
    // listing itself hides
    const scoped: WhereOptions<Document> = options.includeDrafts
      ? where
      : {
          [Op.and]: [
            where,
            { publishedAt: { [Op.ne]: null }, template: false },
          ],
        };

    const rows = (await Document.unscoped().findAll({
      attributes: columns.map((column) => [
        Sequelize.literal(this.expression(column.propertyId, column.summary!)),
        `summary_${column.propertyId}`,
      ]),
      where: scoped,
      raw: true,
      transaction: options.transaction,
    })) as unknown as Record<string, unknown>[];

    for (const column of columns) {
      const value = rows[0]?.[`summary_${column.propertyId}`];
      summaries[column.propertyId] =
        value === null || value === undefined ? null : Number(value);
    }

    return summaries;
  }

  /**
   * Builds the SQL aggregate expression for one summary.
   *
   * Numeric reductions guard on `jsonb_typeof` so a value stored under a
   * property whose type later changed cannot raise a cast error — such a value
   * is simply not counted.
   */
  private static expression(
    propertyId: string,
    aggregation: SummaryAggregation
  ): string {
    const key = sequelize.escape(propertyId);
    const column = `"document"."properties"`;
    const present = `(${column} ? ${key})`;
    const text = `(${column} #>> ARRAY[${key}])`;
    const numeric = `CASE WHEN jsonb_typeof(${column} -> ${key}) = 'number' THEN ${text}::numeric END`;

    switch (aggregation) {
      case SummaryAggregation.Count:
        return `COUNT(*)`;
      case SummaryAggregation.Filled:
        return `COUNT(*) FILTER (WHERE ${present})`;
      case SummaryAggregation.Empty:
        return `COUNT(*) FILTER (WHERE NOT ${present})`;
      case SummaryAggregation.Unique:
        return `COUNT(DISTINCT ${text})`;
      case SummaryAggregation.Sum:
        return `COALESCE(SUM(${numeric}), 0)`;
      case SummaryAggregation.Avg:
        return `AVG(${numeric})`;
      case SummaryAggregation.Min:
        return `MIN(${numeric})`;
      case SummaryAggregation.Max:
        return `MAX(${numeric})`;
    }
  }
}
