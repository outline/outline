// @flow
import fractionalIndex from "fractional-index";
import { Collection } from "../models";
import { sequelize } from "../sequelize";

export default async function removeIndexCollisions(
  teamId: string,
  index?: string,
  collections?: Collection[]
) {
  if (!collections) {
    collections = await Collection.findAll({
      where: { teamId, deletedAt: null },
      attributes: ["id", "index", "updatedAt", "name"],
      order: [
        sequelize.literal('"collection"."index" collate "C"'),
        ["updatedAt", "DESC"],
      ],
    });
  }

  collections = collections.map((collection) => {
    return [collection, collection.index];
  });

  // a set to store the index value of collections.
  const indexSet = new Set();

  if (index) {
    indexSet.add(index);
  }

  let collision = false;

  // make the index null, if there is index collision
  collections = collections.map((collection) => {
    if (indexSet.has(collection[1])) {
      collision = true;
      collection[1] = null;
      return collection;
    }
    indexSet.add(collection[1]);
    return collection;
  });

  if (!collision) {
    return;
  }

  let indexArray = Array.from(indexSet);
  indexArray.sort();

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
    }
  }
}
