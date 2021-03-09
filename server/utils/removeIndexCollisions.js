// @flow
import fractionalIndex from "fractional-index";
import { Collection } from "../models";

export default async function removeIndexCollisions(
  teamId: string,
  index?: string,
  collections?: Collection[]
) {
  collections = collections
    ? collections
    : await Collection.findAll({
        where: { teamId, deletedAt: null }, //no point in maintaining index of deleted collections.
        attributes: ["id", "index", "updatedAt"],
      });

  // use updatedAt because in case of index collision we need to have a predictable order
  collections.sort((a, b) => {
    if (a.index === b.index) {
      return a.updatedAt > b.updatedAt ? -1 : 1;
    }
    return a.index < b.index ? -1 : 1;
  });

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

  let indexArray = Array.from(indexSet);
  indexArray.sort();

  if (!collision) {
    return;
  }

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
