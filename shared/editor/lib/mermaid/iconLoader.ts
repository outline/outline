// Types for icon pack data (avoiding direct import due to build issues)
type IconPack = any;

// Cache for loaded icon packs to avoid re-fetching
const iconPackCache = new Map<string, IconPack>();

/**
 * Determines if a string is a URL or a local filename
 */
function isUrl(urlOrFilename: string): boolean {
  return urlOrFilename.startsWith("http://") || urlOrFilename.startsWith("https://");
}

/**
 * Loads a single icon JSON file
 * Supports both local filenames and remote URLs
 */
export async function loadIconPack(urlOrFilename: string): Promise<IconPack | null> {
  // Check cache first
  if (iconPackCache.has(urlOrFilename)) {
    return iconPackCache.get(urlOrFilename)!;
  }

  try {
    // Determine the fetch URL
    const fetchUrl = isUrl(urlOrFilename)
      ? urlOrFilename
      : `/mermaid/icons/${urlOrFilename}`;

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      // Failed to load icon pack, return null
      return null;
    }

    // Parse the JSON response
    const iconData = await response.json();

    // Cache the result
    iconPackCache.set(urlOrFilename, iconData);

    return iconData;
  } catch (_error) {
    // Error loading icon pack, return null
    return null;
  }
}

/**
 * Loads multiple icon packs
 */
export async function loadIconPacks(
  configs: Array<{ name: string; url: string }>
): Promise<Array<{ name: string; icons: IconPack }>> {
  const promises = configs.map(async (config) => {
    const icons = await loadIconPack(config.url);
    return icons ? { name: config.name, icons } : null;
  });

  const results = await Promise.all(promises);

  // Filter out failed loads
  return results.filter((result): result is { name: string; icons: IconPack } => result !== null);
}

/**
 * Clears the icon pack cache (useful for testing or forced refresh)
 */
export function clearIconPackCache(): void {
  iconPackCache.clear();
}
