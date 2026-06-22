import type { Transaction } from "sequelize";
import type { Collection, User } from "@server/models";
import { CollectionMaintainer } from "@server/models";

/**
 * Check whether a user can review change requests for a collection.
 *
 * @param user User to check.
 * @param collection Collection to check maintainership for.
 * @param transaction Optional database transaction.
 * @return True if the user is a team admin or explicit collection maintainer.
 */
export async function isCollectionMaintainer(
  user: User,
  collection: Collection,
  transaction?: Transaction
): Promise<boolean> {
  if (user.isAdmin) {
    return true;
  }

  const maintainerCount = await CollectionMaintainer.count({
    where: {
      collectionId: collection.id,
      userId: user.id,
    },
    transaction,
  });

  return maintainerCount > 0;
}

/**
 * Load collection ids the user maintains.
 *
 * @param user User to load maintained collections for.
 * @param transaction Optional database transaction.
 * @return Collection ids the user maintains.
 */
export async function maintainedCollectionIdsForUser(
  user: User,
  transaction?: Transaction
): Promise<string[]> {
  const maintainers = await CollectionMaintainer.findAll({
    attributes: ["collectionId"],
    where: {
      userId: user.id,
    },
    transaction,
  });

  return maintainers.map((maintainer) => maintainer.collectionId);
}
