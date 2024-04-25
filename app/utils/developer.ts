import flatten from "lodash/flatten";
import stores from "~/stores";
import { flattenTree } from "./tree";

/**
 * Delete all databases in the browser.
 *
 * @returns A promise that resolves when all databases have been deleted.
 */
export async function deleteAllDatabases() {
  if ("databases" in window.indexedDB) {
    const databases = await window.indexedDB.databases();

    for (const database of databases) {
      if (database.name) {
        window.indexedDB.deleteDatabase(database.name);
      }
    }
    return;
  }

  // If the browser does not support listing databases, we need to manually delete as best we can
  // by iterating over all known collections and documents.
  await Promise.all(
    stores.collections.orderedData.map(async (collection) => {
      const nodes = flatten(collection.documents?.map(flattenTree));

      return nodes.map(async (node) => {
        window.indexedDB.deleteDatabase(`document.${node.id}`);
      });
    })
  );
}
