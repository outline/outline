// A function to delete all IndexedDB databases
export async function deleteAllDatabases() {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'databases' does not exist on type 'IDBFa... Remove this comment to see the full error message
  const databases = await window.indexedDB.databases();

  for (const database of databases) {
    if (database.name) {
      await window.indexedDB.deleteDatabase(database.name);
    }
  }
}
