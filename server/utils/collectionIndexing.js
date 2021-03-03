// @flow
import fractionalIndex from "fractional-index";
import { Collection } from "../models";
export default async function collectionIndexing(teamId: string) {
  const collections = await Collection.findAll({
    where: { teamId, deletedAt: null }, //no point in maintaining index of deleted collections.
    attributes: ["id", "index"],
  });

  let sortableCollections = collections.map((collection) => {
    return [collection, collection.index];
  });

  // a set to store the index value of collections.
  const indexSet = new Set();

  // make the index null, if there is index collision
  sortableCollections = sortableCollections.map((collection) => {
    if (collection[1] === null) {
      return collection;
    } else if (indexSet.has(collection[1])) {
      collection[1] = null;
      return collection;
    }
    indexSet.add(collection[1]);
    return collection;
  });

  //sort the collection in ASC and such that null values are the end
  sortableCollections.sort((a, b) => {
    if (a[1] === b[1]) {
      return 0;
    } else if (a[1] === null) {
      return 1;
    } else if (b[1] === null) {
      return -1;
    }
    return a[1] < b[1] ? -1 : 1;
  });

  //for each collection with null index, use previous collection index to create new index
  let previousCollectionIndex = null;
  for (const collection of sortableCollections) {
    if (collection[1] === null) {
      const index = fractionalIndex(collection[1], previousCollectionIndex);
      collection[0].index = index;
      await collection[0].save();
    }
    previousCollectionIndex = collection[0].index;
  }

  const indexedCollections = {};
  sortableCollections.forEach((collection) => {
    indexedCollections[collection[0].id] = collection[0].index;
  });

  return indexedCollections;
}
