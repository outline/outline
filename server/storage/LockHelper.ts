import type { Sequelize, Transaction } from "sequelize";
import { QueryTypes } from "sequelize";

/**
 * Helper for taking advisory locks in the database.
 *
 * These locks are scoped to a transaction. When the routine to serialize is not
 * a transaction, or it calls an external service, use `MutexLock` instead.
 */
export class LockHelper {
  /**
   * Take an advisory lock that is held for the remainder of the given
   * transaction, blocking every other transaction that asks for the same name
   * until this one commits or rolls back.
   *
   * Use this to make a read-then-write sequence atomic when there is no row to
   * lock, such as counting rows before inserting one more.
   *
   * @param sequelize the database connection to take the lock on.
   * @param name the name of the lock, shared by everything that must serialize.
   * @param transaction the transaction to hold the lock for. When none is given
   * the lock cannot be held and is skipped.
   * @returns a promise that resolves when the lock is held.
   */
  public static async acquire(
    sequelize: Sequelize,
    name: string,
    transaction?: Transaction | null
  ): Promise<void> {
    if (!transaction) {
      return;
    }

    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:name))", {
      replacements: { name },
      type: QueryTypes.SELECT,
      transaction,
    });
  }
}
