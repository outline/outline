import { flatten } from "es-toolkit/compat";
import stores from "~/stores";
import Store from "~/stores/base/Store";
import StorePersistence from "~/stores/base/StorePersistence";
import { flattenTree } from "@shared/utils/tree";

/**
 * Delete all databases in the browser.
 *
 * @returns A promise that resolves when all databases have been deleted.
 */
export async function deleteAllDatabases() {
  if (!window.indexedDB) {
    return;
  }

  // Close any connections this tab holds open, otherwise the deletions below
  // are blocked until they are, and in-flight reads and writes are aborted.
  stores.disablePersistence();

  const teamId = stores.auth.currentTeamId;
  if (teamId) {
    Object.values(stores).forEach((store) => {
      if (store instanceof Store && store.persistable) {
        window.indexedDB.deleteDatabase(
          StorePersistence.databaseName(store.apiEndpoint, teamId)
        );
      }
    });
  }

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
