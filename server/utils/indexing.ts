import fractionalIndex from "fractional-index";
import { FindOptions } from "sequelize";
import naturalSort from "@shared/utils/naturalSort";
import { Collection, Document, Star } from "@server/models";

export async function collectionIndexing(
  teamId: string,
  { transaction }: FindOptions<Collection>
) {
  const collections = await Collection.findAll({
    where: {
      teamId,
    },
    transaction,
  });

  const sortable = naturalSort(collections, (collection) => collection.name);

  // for each collection with null index, use previous collection index to create new index
  let previousIndex = null;
  const promises = [];

  for (const collection of sortable) {
    if (collection.index === null) {
      collection.index = fractionalIndex(previousIndex, null);
      promises.push(
        collection.save({ fields: ["index"], silent: true, transaction })
      );
    }

    previousIndex = collection.index;
  }

  await Promise.all(promises);

  const indexedCollections: Record<string, string | null> = {};
  sortable.forEach((collection) => {
    indexedCollections[collection.id] = collection.index;
  });
  return indexedCollections;
}

export async function starIndexing(userId: string) {
  const stars = await Star.findAll({
    where: { userId },
  });

  const documents = await Document.findAll({
    attributes: ["id", "updatedAt"],
    where: {
      id: stars.map((star) => star.documentId).filter(Boolean) as string[],
    },
    order: [["updatedAt", "DESC"]],
  });

  const sortable = stars.sort(function (a, b) {
    return (
      documents.findIndex((d) => d.id === a.documentId) -
      documents.findIndex((d) => d.id === b.documentId)
    );
  });

  let previousIndex = null;
  const promises = [];

  for (const star of sortable) {
    if (star.index === null) {
      star.index = fractionalIndex(previousIndex, null);
      promises.push(star.save({ silent: true }));
    }

    previousIndex = star.index;
  }

  await Promise.all(promises);

  const indexedStars: Record<string, string | null> = {};
  sortable.forEach((star) => {
    indexedStars[star.id] = star.index;
  });
  return indexedStars;
}
