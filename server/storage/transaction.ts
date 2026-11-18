import type { Transaction } from "sequelize";

/**
 * Runs a callback after the outermost transaction commits, or at once when
 * there is no transaction. Nested transactions are savepoints, and Sequelize
 * runs their commit hooks when the savepoint is released, so the callback is
 * always registered on the root transaction.
 *
 * Note that an error thrown by the callback after a commit is passed to the
 * caller of `commit`, so callbacks that must not fail the operation should
 * handle their own errors.
 *
 * @param transaction the transaction to wait for, if any.
 * @param callback the function to run.
 * @returns a promise that resolves when the callback has run, or has been
 * registered to run after the commit.
 */
export async function afterCommit<T>(
  transaction: Transaction | null | undefined,
  callback: () => T | Promise<T>
): Promise<void> {
  if (!transaction) {
    await callback();
    return;
  }

  let root = transaction;
  while (root.parent) {
    root = root.parent;
  }

  // oxlint-disable-next-line sequelize/prefer-after-commit-helper
  root.afterCommit(async () => {
    await callback();
  });
}
