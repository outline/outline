import { flatten } from "es-toolkit/compat";
import {
  MultiplayerEntityType,
  toMultiplayerName,
} from "@shared/collaboration/EntityName";
import stores from "~/stores";
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

  if ("databases" in window.indexedDB) {
    const databases = await window.indexedDB.databases();

    await Promise.all(
      databases.flatMap((database) =>
        database.name ? [deleteDatabase(database.name)] : []
      )
    );
    return;
  }

  // If the browser does not support listing databases, we need to manually delete as best we can
  // by iterating over all known collections and documents.
  await Promise.all(
    stores.collections.orderedData.flatMap((collection) => {
      const nodes = flatten(collection.documents?.map(flattenTree));

      return [
        deleteDatabase(
          toMultiplayerName(MultiplayerEntityType.Collection, collection.id)
        ),
        ...nodes.map((node) =>
          deleteDatabase(
            toMultiplayerName(MultiplayerEntityType.Document, node.id)
          )
        ),
      ];
    })
  );
}

/**
 * Delete a single IndexedDB database by name, resolving once the request
 * settles. Best-effort: resolves rather than rejects on error or block so a
 * single failure does not abort the wider cleanup.
 *
 * @param name The name of the database to delete.
 * @returns A promise that resolves when the deletion request settles.
 */
function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
