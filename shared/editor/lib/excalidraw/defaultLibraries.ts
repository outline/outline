import { loadLibraryFiles } from "./libraryLoader";

// Type for LibraryItem (avoiding direct import due to build issues)
type LibraryItem = any;

// List of library files to preload - all available libraries
const DEFAULT_LIBRARY_FILES = [
  "aws-architecture-icons.excalidrawlib",
  "cloud-design-patterns.excalidrawlib",
  "cloud.excalidrawlib",
  "data-viz.excalidrawlib",
  "db-eng.excalidrawlib",
  "dev_ops.excalidrawlib",
  "drwnio.excalidrawlib",
  "forms.excalidrawlib",
  "google-icons.excalidrawlib",
  "icons.excalidrawlib",
  "microsoft-azure-cloud-icons.excalidrawlib",
  "azure-cloud-services.excalidrawlib",
  "software-architecture.excalidrawlib",
  "system-design.excalidrawlib",
  "technology-logos.excalidrawlib",
] as const;

// Cache for the loaded default libraries
let cachedDefaultLibraries: LibraryItem[] | null = null;
let loadingPromise: Promise<LibraryItem[]> | null = null;

/**
 * Loads the default library files and returns them as LibraryItems
 * Uses caching to avoid reloading on subsequent calls
 */
export async function getDefaultLibraries(): Promise<LibraryItem[]> {
  // Return cached result if available
  if (cachedDefaultLibraries) {
    return cachedDefaultLibraries;
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading libraries
  loadingPromise = loadLibraryFiles([...DEFAULT_LIBRARY_FILES]);

  try {
    const libraries = await loadingPromise;
    cachedDefaultLibraries = libraries;
    return libraries;
  } catch (_error) {
    // Failed to load libraries, return empty array
    return [];
  } finally {
    loadingPromise = null;
  }
}

/**
 * Gets a specific subset of libraries by filenames
 */
export async function getLibrariesByFiles(filenames: string[]): Promise<LibraryItem[]> {
  return loadLibraryFiles(filenames);
}

/**
 * Clears the cached default libraries (useful for testing or forced refresh)
 */
export function clearDefaultLibrariesCache(): void {
  cachedDefaultLibraries = null;
  loadingPromise = null;
}

/**
 * Gets the list of available library files
 */
export function getAvailableLibraryFiles(): readonly string[] {
  return DEFAULT_LIBRARY_FILES;
}