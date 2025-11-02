import type { LibraryItem } from "@excalidraw/excalidraw/dist/types/excalidraw/types";
import { LRUCache } from "lru-cache";

// Unified cache for library files and configurations (limited to prevent memory leaks)
const libraryFileCache = new LRUCache<string, LibraryItem[]>({ max: 100 }); // Individual library files
const libraryConfigCache = new LRUCache<string, LibraryItem[]>({ max: 50 }); // Library configurations
const loadingPromises = new LRUCache<string, Promise<LibraryItem[]>>({ max: 50 });

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
async function loadLibraryFile(urlOrFilename: string): Promise<LibraryItem[]> {
  // Check cache first
  if (libraryFileCache.has(urlOrFilename)) {
    return libraryFileCache.get(urlOrFilename)!;
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
    libraryFileCache.set(urlOrFilename, libraryItems);

    return libraryItems;
  } catch (_error) {
    // Error loading library file, return empty array
    return [];
  }
}

/**
 * Loads multiple library files and combines them
 */
async function loadLibraryFiles(filenames: string[]): Promise<LibraryItem[]> {
  const promises = filenames.map(filename => loadLibraryFile(filename));
  const results = await Promise.all(promises);

  // Flatten all library items into a single array
  return results.flat();
}

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
  if (libraryConfigCache.has(cacheKey)) {
    return libraryConfigCache.get(cacheKey)!;
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
    libraryConfigCache.set(cacheKey, libraries);
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
 * Clears all cached libraries (useful for testing or forced refresh)
 */
export function clearDefaultLibrariesCache(): void {
  libraryFileCache.clear();
  libraryConfigCache.clear();
  loadingPromises.clear();
}