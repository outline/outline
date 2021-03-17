// @flow
import fractionalIndex from "fractional-index";
import { Collection } from "../models";
import { sequelize, Op } from "../sequelize";

/**
 *
 * @param teamId The team id whose collections has to be fetched
 * @param index the index for which collision has to be checked
 * @returns An array or undefined. If array, each array element is an array of collided collection id and its new index [id,newIndex]
 */
export default async function removeIndexCollisions(
  teamId: string,
  index: string
) {
  let collections = await Collection.findAll({
    where: { teamId, deletedAt: null, index },
    attributes: ["id", "index"],
    order: [
      sequelize.literal('"collection"."index" collate "C"'),
      ["updatedAt", "DESC"],
    ],
  });

  if (collections.length < 1) {
    return;
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
      sequelize.literal('"collection"."index" collate "C"'),
      ["updatedAt", "DESC"],
    ],
  });

  collections = collections.map((collection) => {
    return [collection, collection.index];
  });

  if (nextCollection.length) {
    collections.push([nextCollection[0], nextCollection[0].index]);
  }

  // a set to store the index value of collections.
  const indexSet = new Set();

  // make the index null, if there is index collision
  collections = collections.map((collection) => {
    if (indexSet.has(collection[1])) {
      collection[1] = null;
      return collection;
    }
    indexSet.add(collection[1]);
    return collection;
  });

  let indexArray = Array.from(indexSet);

  const collectionIdsWithIndex = [];

  for (const [i, collection] of collections.entries()) {
    if (collection[1] === null) {
      const previousCollectionIndex = i - 1 < 0 ? null : indexArray[i - 1];
      const nextCollectionIndex =
        i === indexArray.length ? null : indexArray[i];
      const newIndex = fractionalIndex(
        previousCollectionIndex,
        nextCollectionIndex
      );
      indexArray.splice(i, 0, newIndex);
      await collection[0].update({ index: newIndex });
      collectionIdsWithIndex.push([collection[0].id, newIndex]);
    }
  }

  return collectionIdsWithIndex;
}
