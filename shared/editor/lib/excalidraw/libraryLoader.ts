// Types for Excalidraw elements and library items (avoiding direct import due to build issues)
type LibraryItem = any;

// Cache for loaded libraries to avoid re-fetching
const libraryCache = new Map<string, LibraryItem[]>();

/**
 * Loads a single .excalidrawlib file and converts it to LibraryItem format using Excalidraw's utilities
 */
export async function loadLibraryFile(filename: string): Promise<LibraryItem[]> {
  // Check cache first
  if (libraryCache.has(filename)) {
    return libraryCache.get(filename)!;
  }

  try {
    const response = await fetch(`/excalidraw/libraries/${filename}`);
    if (!response.ok) {
      // Failed to load library file, return empty array
      return [];
    }

    // Get the response as a Blob
    const blob = await response.blob();

    // Use Excalidraw's loadLibraryFromBlob utility to properly parse the library
    const { loadLibraryFromBlob } = await import("@excalidraw/excalidraw");
    const libraryItems = await loadLibraryFromBlob(blob);

    // Cache the result
    libraryCache.set(filename, libraryItems);

    return libraryItems;
  } catch (_error) {
    // Error loading library file, return empty array
    return [];
  }
}

/**
 * Loads multiple library files and combines them
 */
export async function loadLibraryFiles(filenames: string[]): Promise<LibraryItem[]> {
  const promises = filenames.map(filename => loadLibraryFile(filename));
  const results = await Promise.all(promises);

  // Flatten all library items into a single array
  return results.flat();
}

/**
 * Clears the library cache (useful for testing or forced refresh)
 */
export function clearLibraryCache(): void {
  libraryCache.clear();
}