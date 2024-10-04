import fractionalIndex from "fractional-index";
import { Op, Sequelize, type FindOptions } from "sequelize";
import Collection from "@server/models/Collection";

/**
 *
 * @param teamId The team id whose collections has to be fetched
 * @param index the index for which collision has to be checked
 * @param options Additional options to be passed to the query
 * @returns An index, if there is collision returns a new index otherwise the same index
 */
export default async function removeIndexCollision(
  teamId: string,
  index: string,
  options: FindOptions = {}
) {
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

  const nextCollection = await Collection.findAll({
    where: {
      teamId,
      deletedAt: null,
      index: {
        [Op.gt]: index,
      },
    },
    attributes: ["id", "index"],
    limit: 1,
    order: [
      Sequelize.literal('"collection"."index" collate "C"'),
      ["updatedAt", "DESC"],
    ],
    ...options,
  });
  const nextCollectionIndex = nextCollection.length
    ? nextCollection[0].index
    : null;
  return fractionalIndex(index, nextCollectionIndex);
}
