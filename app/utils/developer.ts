// A function to delete all IndexedDB databases
export async function deleteAllDatabases() {
  const databases = await window.indexedDB.databases();

  for (const database of databases) {
    if (database.name) {
      window.indexedDB.deleteDatabase(database.name);
    }
  }
}
