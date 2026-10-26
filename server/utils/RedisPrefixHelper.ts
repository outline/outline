/**
 * Helper class for Redis cache key generation.
 */
export class RedisPrefixHelper {
  /**
   * Gets key against which unfurl response for the given url is stored. The
   * key includes the user as unfurls can depend on the user's linked accounts.
   *
   * @param teamId The team ID to generate a key for.
   * @param userId The user ID to generate a key for.
   * @param url The url to generate a key for.
   * @returns the cache key string.
   */
  public static getUnfurlKey(teamId: string, userId: string, url: string) {
    return `${RedisPrefixHelper.getUnfurlPrefix(teamId)}${userId}:${url}`;
  }

  /**
   * Gets the prefix shared by all unfurl keys of a team, or of all teams if no
   * team is given.
   *
   * @param teamId The team ID to generate a prefix for.
   * @returns the cache key prefix string.
   */
  public static getUnfurlPrefix(teamId?: string) {
    return teamId ? `unfurl:${teamId}:` : "unfurl:";
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

  /**
   * Gets key for caching a user's accessible collection IDs.
   *
   * @param userId The user ID to generate a key for.
   * @returns the cache key string.
   */
  public static getUserCollectionIdsKey(userId: string) {
    return `uc:${userId}`;
  }

  /**
   * Gets key for caching the document IDs a user is a member of.
   *
   * @param userId The user ID to generate a key for.
   * @returns the cache key string.
   */
  public static getUserMembershipDocumentIdsKey(userId: string) {
    return `ud:${userId}`;
  }

  /**
   * Gets key for caching a team's enabled webhook subscriptions.
   *
   * @param teamId The team ID to generate a key for.
   * @returns the cache key string.
   */
  public static getWebhookSubscriptionsKey(teamId: string) {
    return `whs:${teamId}`;
  }

  /**
   * Gets key for caching the count of a relationship managed by the
   * `CounterCache` decorator.
   *
   * @param modelName The owning model name (e.g. "Group").
   * @param relationName The relationship reference name (e.g. "members").
   * @param id The owning record id.
   * @returns the cache key string.
   */
  public static getCounterCacheKey(
    modelName: string,
    relationName: string,
    id: string
  ) {
    return `count:${modelName}:${relationName}:${id}`;
  }

  /**
   * Gets key for storing an auth provider's token used as a logout hint during
   * provider-initiated logout, referenced by a short session identifier.
   *
   * @param provider The auth provider id (e.g. "oidc").
   * @param sessionId The logout session identifier to generate a key for.
   * @returns the cache key string.
   */
  public static getLogoutTokenKey(provider: string, sessionId: string) {
    return `auth:logout:${provider}:${sessionId}`;
  }

  /**
   * Gets key for marking an email sign-in token as used.
   *
   * @param tokenHash The SHA-256 hash of the sign-in token.
   * @returns the cache key string.
   */
  public static getEmailSigninTokenKey(tokenHash: string) {
    return `auth:email-signin:${tokenHash}`;
  }
}
