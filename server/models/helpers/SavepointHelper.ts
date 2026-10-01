import type {
  Attributes,
  Model,
  ModelStatic,
  Transaction,
  WhereOptions,
} from "sequelize";
import { UniqueConstraintError } from "sequelize";
import { sequelize } from "@server/storage/database";

/**
 * Helper class for writes that may race inside an open transaction
 */
export default class SavepointHelper {
  /**
   * Finds a row or creates it inside a savepoint. A concurrent insert of the
   * same unique row raises a unique violation, which would otherwise abort
   * the whole outer transaction; rolling back only the savepoint keeps it
   * usable so the winning row can be read instead.
   *
   * @param model The model to find or create.
   * @param where The unique attributes identifying the row.
   * @param transaction The outer, already open, transaction.
   * @param create Creates the row within the given savepoint.
   * @returns a tuple of the instance and whether it was created.
   */
  public static async findOrCreate<M extends Model>(
    model: ModelStatic<M>,
    where: WhereOptions<Attributes<M>>,
    transaction: Transaction,
    create: (savepoint: Transaction) => Promise<M>
  ): Promise<[M, boolean]> {
    const existing = await model.findOne({ where, transaction });
    if (existing) {
      return [existing, false];
    }

    try {
      return [await sequelize.transaction({ transaction }, create), true];
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        const found = await model.findOne({ where, transaction });
        if (found) {
          return [found, false];
        }
      }
      throw err;
    }
  }
}
