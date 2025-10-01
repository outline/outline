import { loadIconPacks } from "./iconLoader";

// Type for icon pack (avoiding direct import due to build issues)
type IconPackData = any;

// Cache for the loaded icon packs by configuration
const iconPackCache = new Map<string, Array<{ name: string; icons: IconPackData }>>();
const loadingPromises = new Map<string, Promise<Array<{ name: string; icons: IconPackData }>>>();

/**
 * Loads icon packs and returns them ready for Mermaid registration
 * Uses caching based on the icon pack configuration to avoid reloading
 *
 * @param iconPackConfigs Array of icon pack configurations with name and URL
 * @returns Promise resolving to array of icon packs ready for registerIconPacks
 */
export async function getDefaultIconPacks(
  iconPackConfigs?: Array<{ name: string; url: string }>
): Promise<Array<{ name: string; icons: IconPackData }>> {
  // If no icon packs specified, return empty array
  if (!iconPackConfigs || iconPackConfigs.length === 0) {
    return [];
  }

  // Create cache key from sorted configs
  const cacheKey = iconPackConfigs
    .map((config) => `${config.name}:${config.url}`)
    .sort()
    .join("|");

  // Return cached result if available
  if (iconPackCache.has(cacheKey)) {
    return iconPackCache.get(cacheKey)!;
  }

  // Return existing loading promise if already loading
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey)!;
  }

  // Start loading icon packs
  const loadingPromise = loadIconPacks(iconPackConfigs);
  loadingPromises.set(cacheKey, loadingPromise);

  try {
    const iconPacks = await loadingPromise;
    iconPackCache.set(cacheKey, iconPacks);
    return iconPacks;
  } catch (_error) {
    // Failed to load icon packs, return empty array
    return [];
  } finally {
    loadingPromises.delete(cacheKey);
  }
}

/**
 * Clears the cached icon packs (useful for testing or forced refresh)
 */
export function clearDefaultIconPacksCache(): void {
  iconPackCache.clear();
  loadingPromises.clear();
}
