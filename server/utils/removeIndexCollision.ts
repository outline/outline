import fractionalIndex from "fractional-index";
import { Op, Sequelize } from "sequelize";
import Collection from "@server/models/Collection";

/**
 *
 * @param teamId The team id whose collections has to be fetched
 * @param index the index for which collision has to be checked
 * @returns An index, if there is collision returns a new index otherwise the same index
 */
export default async function removeIndexCollision(
  teamId: string,
  index: string
) {
  const collection = await Collection.findOne({
    where: {
      teamId,
      deletedAt: null,
      index,
    },
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
  });
  const nextCollectionIndex = nextCollection.length
    ? nextCollection[0].index
    : null;
  return fractionalIndex(index, nextCollectionIndex);
}
