import type Collection from "@server/models/Collection";
import type Document from "@server/models/Document";
import type Team from "@server/models/Team";
import type User from "@server/models/User";
import type { SearchOptions, SearchResponse } from "@server/utils/BaseSearchProvider";
import SearchProviderManager from "@server/utils/SearchProviderManager";
import PostgresSearchProvider from "@server/../plugins/postgres-search/server/PostgresSearchProvider";

export type { SearchOptions, SearchResponse };

/**
 * @deprecated Use `SearchProviderManager.getProvider()` directly instead.
 * This class is a thin wrapper that delegates to the active search provider.
 */
export default class SearchHelper {
  /**
   * The maximum length of a search query.
   */
  public static maxQueryLength = 1000;

  /**
   * Search for documents within a team scope (used for shared document search).
   *
   * @param team - the team to search within.
   * @param options - search options.
   * @returns search results with ranking and context.
   * @deprecated Use `SearchProviderManager.getProvider().searchForTeam()` instead.
   */
  public static async searchForTeam(
    team: Team,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    return SearchProviderManager.getProvider().searchForTeam(team, options);
  }

  /**
   * Search document titles for a user.
   *
   * @param user - the user performing the search.
   * @param options - search options.
   * @returns matching documents.
   * @deprecated Use `SearchProviderManager.getProvider().searchTitlesForUser()` instead.
   */
  public static async searchTitlesForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<Document[]> {
    return SearchProviderManager.getProvider().searchTitlesForUser(
      user,
      options
    );
  }

  /**
   * Search collections for a user.
   *
   * @param user - the user performing the search.
   * @param options - search options.
   * @returns matching collections.
   * @deprecated Use `SearchProviderManager.getProvider().searchCollectionsForUser()` instead.
   */
  public static async searchCollectionsForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<Collection[]> {
    return SearchProviderManager.getProvider().searchCollectionsForUser(
      user,
      options
    );
  }

  /**
   * Perform a full-text search scoped to a user's accessible documents.
   *
   * @param user - the user performing the search.
   * @param options - search options.
   * @returns search results with ranking and context.
   * @deprecated Use `SearchProviderManager.getProvider().searchForUser()` instead.
   */
  public static async searchForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    return SearchProviderManager.getProvider().searchForUser(user, options);
  }

  /**
   * Convert a user search query into a format that can be used by Postgres.
   *
   * @param query - the user search query.
   * @returns the query formatted for Postgres ts_query.
   * @deprecated Use `PostgresSearchProvider.webSearchQuery()` instead.
   */
  public static webSearchQuery(query: string): string {
    return PostgresSearchProvider.webSearchQuery(query);
  }
}
