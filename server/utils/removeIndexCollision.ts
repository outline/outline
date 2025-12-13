import fractionalIndex from "fractional-index";
import { QueryTypes, type FindOptions } from "sequelize";
import Collection from "@server/models/Collection";
import { sequelize } from "@server/storage/database";

interface CollectionIndexResult {
  id: string;
  index: string;
}

/**
 * Checks for index collision and returns a new index if collision exists.
 *
 * @param teamId The team id whose collections has to be fetched
 * @param index The index for which collision has to be checked
 * @param options Additional options to be passed to the query
 * @returns An index, if there is collision returns a new index otherwise the same index
 */
export default async function removeIndexCollision(
  teamId: string,
  index: string,
  options: FindOptions = {}
): Promise<string> {
  const collection = await Collection.findOne({
    where: {
      teamId,
      deletedAt: null,
      index,
    },
    ...options,
  });

  if (!collection) {
    return index;
  }

  // Use parameterized query to prevent SQL injection
  const nextCollection = await sequelize.query<CollectionIndexResult>(
    `SELECT "id", "index" FROM "collections"
     WHERE "teamId" = :teamId
       AND "deletedAt" IS NULL
       AND "index" collate "C" > :index
     ORDER BY "index" collate "C", "updatedAt" DESC
     LIMIT 1`,
    {
      replacements: { teamId, index },
      type: QueryTypes.SELECT,
      transaction: options.transaction,
    }
  );

  const nextCollectionIndex = nextCollection.length
    ? nextCollection[0].index
    : null;
  return fractionalIndex(index, nextCollectionIndex);
}
