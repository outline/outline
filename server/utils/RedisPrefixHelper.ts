/**
 * Helper class for Redis cache key generation.
 */
export class RedisPrefixHelper {
  /**
   * Gets key against which unfurl response for the given url is stored.
   *
   * @param teamId The team ID to generate a key for.
   * @param url The url to generate a key for.
   */
  public static getUnfurlKey(teamId: string, url = "") {
    return `unfurl:${teamId}:${url}`;
  }

  /**
   * Gets key for caching collection documents structure.
   *
   * @param collectionId The collection ID to generate a key for.
   * @returns the cache key string.
   */
  public static getCollectionDocumentsKey(collectionId: string) {
    return `cd:${collectionId}`;
  }

  /**
   * Gets key for caching embed check results. This is a global cache key
   * (not team-specific) since embed headers are the same for all users.
   *
   * @param url The URL to generate a cache key for.
   * @returns the cache key string.
   */
  public static getEmbedCheckKey(url: string) {
    return `embed:${url}`;
  }
}
