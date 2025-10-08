import { loadLibraryFiles } from "./libraryLoader";
import type { LibraryItem } from "@excalidraw/excalidraw/dist/types/excalidraw/types";
import { LRUCache } from "./lru-cache";

// Cache for the loaded libraries by configuration (limited to prevent memory leaks)
const libraryCache = new LRUCache<string, LibraryItem[]>(50); // Limit to 50 library configs
const loadingPromises = new LRUCache<string, Promise<LibraryItem[]>>(50);

/**
 * Loads library files and returns them as LibraryItems
 * Uses caching based on the library configuration to avoid reloading
 *
 * @param libraryUrls Array of library URLs or filenames to load
 * @returns Promise resolving to array of LibraryItems
 */
export async function getDefaultLibraries(
  libraryUrls?: string[]
): Promise<LibraryItem[]> {
  // If no libraries specified, return empty array
  if (!libraryUrls || libraryUrls.length === 0) {
    return [];
  }

  // Create cache key from sorted URLs
  const cacheKey = [...libraryUrls].sort().join("|");

  // Return cached result if available
  if (libraryCache.has(cacheKey)) {
    return libraryCache.get(cacheKey)!;
  }

  // Return existing loading promise if already loading
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  // Start loading libraries
  const loadingPromise = loadLibraryFiles(libraryUrls);
  loadingPromises.set(cacheKey, loadingPromise);

  try {
    const libraries = await loadingPromise;
    libraryCache.set(cacheKey, libraries);
    return libraries;
  } catch (_error) {
    // Failed to load libraries, return empty array
    return [];
  } finally {
    loadingPromises.delete(cacheKey);
  }
}

/**
 * Gets a specific subset of libraries by filenames
 */
export async function getLibrariesByFiles(filenames: string[]): Promise<LibraryItem[]> {
  return loadLibraryFiles(filenames);
}

/**
 * Clears the cached libraries (useful for testing or forced refresh)
 */
export function clearDefaultLibrariesCache(): void {
  libraryCache.clear();
  loadingPromises.clear();
}