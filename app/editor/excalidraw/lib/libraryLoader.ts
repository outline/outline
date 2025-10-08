import type { LibraryItem } from "@excalidraw/excalidraw/dist/types/excalidraw/types";
import { LRUCache } from "./lru-cache";

// Cache for loaded libraries to avoid re-fetching (limited to prevent memory leaks)
const libraryCache = new LRUCache<string, LibraryItem[]>(100); // Limit to 100 library files

/**
 * Determines if a string is a URL or a local filename
 */
function isUrl(urlOrFilename: string): boolean {
  return urlOrFilename.startsWith("http://") || urlOrFilename.startsWith("https://");
}

/**
 * Loads a single .excalidrawlib file and converts it to LibraryItem format using Excalidraw's utilities
 * Supports both local filenames and remote URLs
 */
export async function loadLibraryFile(urlOrFilename: string): Promise<LibraryItem[]> {
  // Check cache first
  if (libraryCache.has(urlOrFilename)) {
    return libraryCache.get(urlOrFilename)!;
  }

  try {
    // Determine the fetch URL
    const fetchUrl = isUrl(urlOrFilename)
      ? urlOrFilename
      : `/excalidraw/libraries/${urlOrFilename}`;

    const response = await fetch(fetchUrl);
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
    libraryCache.set(urlOrFilename, libraryItems);

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