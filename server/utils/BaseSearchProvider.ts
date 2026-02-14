import type { DateFilter } from "@shared/types";
import type { SearchableModel } from "@shared/types";
import type {
  DirectionFilter,
  SortFilter,
  StatusFilter,
} from "@shared/types";
import type Collection from "@server/models/Collection";
import type Document from "@server/models/Document";
import type Share from "@server/models/Share";
import type Team from "@server/models/Team";
import type User from "@server/models/User";

export interface SearchResponse {
  results: {
    /** The search ranking, for sorting results. */
    ranking: number;
    /** A snippet of contextual text around the search result. */
    context?: string;
    /** The document result. */
    document: Document;
  }[];
  /** The total number of results for the search query without pagination. */
  total: number;
}

export interface SearchOptions {
  /** The query limit for pagination. */
  limit?: number;
  /** The query offset for pagination. */
  offset?: number;
  /** The text to search for. */
  query?: string;
  /** Limit results to a collection. Authorization is presumed to have been done before passing to this helper. */
  collectionId?: string | null;
  /** Limit results to a shared document. */
  share?: Share;
  /** Limit results to a date range. */
  dateFilter?: DateFilter;
  /** Status of the documents to return. */
  statusFilter?: StatusFilter[];
  /** Limit results to a list of documents. */
  documentIds?: string[];
  /** Limit results to a list of users that collaborated on the document. */
  collaboratorIds?: string[];
  /** The minimum number of words to be returned in the contextual snippet. */
  snippetMinWords?: number;
  /** The maximum number of words to be returned in the contextual snippet. */
  snippetMaxWords?: number;
  /** The field to sort results by. */
  sort?: SortFilter;
  /** The sort direction. */
  direction?: DirectionFilter;
}

/**
 * Abstract base class for search providers. Implementations handle full-text
 * search, title search, collection search, and index management.
 */
export default abstract class BaseSearchProvider {
  /** Unique identifier for this provider, matched against `SEARCH_PROVIDER` env var. */
  abstract id: string;

  /**
   * Perform a full-text search scoped to a user's accessible documents.
   *
   * @param user - the user performing the search.
   * @param options - search options.
   * @returns search results with ranking and context.
   */
  abstract searchForUser(
    user: User,
    options?: SearchOptions
  ): Promise<SearchResponse>;

  /**
   * Perform a full-text search scoped to a team (used for shared document search).
   *
   * @param team - the team to search within.
   * @param options - search options.
   * @returns search results with ranking and context.
   */
  abstract searchForTeam(
    team: Team,
    options?: SearchOptions
  ): Promise<SearchResponse>;

  /**
   * Search document titles for a user (used for link suggestions, quick search).
   *
   * @param user - the user performing the search.
   * @param options - search options.
   * @returns matching documents.
   */
  abstract searchTitlesForUser(
    user: User,
    options?: SearchOptions
  ): Promise<Document[]>;

  /**
   * Search collections for a user.
   *
   * @param user - the user performing the search.
   * @param options - search options.
   * @returns matching collections.
   */
  abstract searchCollectionsForUser(
    user: User,
    options?: SearchOptions
  ): Promise<Collection[]>;

  /**
   * Index or re-index a searchable item. For providers that rely on database
   * triggers (e.g. PostgreSQL tsvector), this may be a no-op.
   *
   * @param model - the type of model being indexed.
   * @param item - the model instance to index.
   */
  abstract index(
    model: SearchableModel,
    item: Document | Collection | Comment
  ): Promise<void>;

  /**
   * Remove an item from the search index.
   *
   * @param model - the type of model being removed.
   * @param id - the id of the item to remove.
   * @param teamId - the team id the item belongs to.
   */
  abstract remove(
    model: SearchableModel,
    id: string,
    teamId: string
  ): Promise<void>;

  /**
   * Update metadata for an indexed item without re-indexing the full content.
   * Useful for permission changes, moves, archive/unarchive.
   *
   * @param model - the type of model being updated.
   * @param id - the id of the item to update.
   * @param metadata - the metadata fields to update.
   */
  abstract updateMetadata(
    model: SearchableModel,
    id: string,
    metadata: Record<string, unknown>
  ): Promise<void>;
}

// Import Comment type separately to avoid circular dependency at runtime
import type Comment from "@server/models/Comment";
