import invariant from "invariant";
import { compact, escapeRegExp, find, map } from "es-toolkit/compat";
import queryParser from "pg-tsquery";
import type {
  BindOrReplacements,
  FindAttributeOptions,
  FindOptions,
  Order,
  WhereOptions,
} from "sequelize";
import { Op, Sequelize } from "sequelize";
import type { Filter } from "@shared/helpers/FilterHelper";
import type { SearchableModel } from "@shared/types";
import { DirectionFilter, SortFilter } from "@shared/types";
import { regexIndexOf, regexLastIndexOf } from "@shared/utils/string";
import { getUrls } from "@shared/utils/urls";
import { ValidationError } from "@server/errors";
import Collection from "@server/models/Collection";
import type Comment from "@server/models/Comment";
import Document from "@server/models/Document";
import Team from "@server/models/Team";
import User from "@server/models/User";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import {
  buildSearchWhere,
  collectEqValues,
} from "@server/models/helpers/Filters";
import { sequelizeReadOnly } from "@server/storage/database";
import { QueryHelper } from "@server/storage/QueryHelper";
import type {
  SearchOptions,
  SearchResponse,
} from "@server/utils/BaseSearchProvider";
import { BaseSearchProvider } from "@server/utils/BaseSearchProvider";

type RankedDocument = Document & {
  id: string;
  dataValues: Partial<Document> & {
    searchRanking: number;
  };
};

/**
 * Search provider that uses PostgreSQL full-text search via tsvector.
 * Indexing is handled by database triggers, so index/remove/updateMetadata
 * are no-ops.
 */
export default class PostgresSearchProvider extends BaseSearchProvider {
  id = "postgres";

  /**
   * The maximum length of a search query.
   */
  public static maxQueryLength = 1000;

  /**
   * Cached regex pattern for single quotes to avoid recompilation.
   */
  private static readonly SINGLE_QUOTE_REGEX = /'+/g;

  /**
   * Cached regex pattern for quoted queries.
   */
  private static readonly QUOTED_QUERY_REGEX = /"([^"]*)"/g;

  /**
   * Cached regex pattern for break characters.
   */
  private static readonly BREAK_CHARS_REGEX = new RegExp(
    `[ .,"'\n。！？!?…]`,
    "g"
  );

  /**
   * Cached stop words set for efficient lookup.
   * Based on: https://github.com/postgres/postgres/blob/fc0d0ce978752493868496be6558fa17b7c4c3cf/src/backend/snowball/stopwords/english.stop
   */
  private static readonly STOP_WORDS = new Set([
    "i",
    "me",
    "my",
    "myself",
    "we",
    "our",
    "ours",
    "ourselves",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
    "he",
    "him",
    "his",
    "himself",
    "she",
    "her",
    "hers",
    "herself",
    "it",
    "its",
    "itself",
    "they",
    "them",
    "their",
    "theirs",
    "themselves",
    "what",
    "which",
    "who",
    "whom",
    "this",
    "that",
    "these",
    "those",
    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "having",
    "do",
    "does",
    "did",
    "doing",
    "a",
    "an",
    "the",
    "and",
    "but",
    "if",
    "or",
    "because",
    "as",
    "until",
    "of",
    "at",
    "by",
    "for",
    "with",
    "about",
    "against",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "from",
    "down",
    "off",
    "over",
    "under",
    "again",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "any",
    "both",
    "each",
    "few",
    "other",
    "some",
    "such",
    "nor",
    "only",
    "same",
    "so",
    "than",
    "too",
    "very",
    "s",
    "t",
    "don",
    "should",
  ]);

  async searchForTeam(
    team: Team,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const { limit = 15, offset = 0, query } = options;

    const where = await PostgresSearchProvider.buildWhere(team, {
      ...options,
      // Team-context search (used by shares) is always restricted to
      // published, non-archived documents.
      filter: PostgresSearchProvider.withPublishedConstraint(options.filter),
    });

    if (options.share) {
      let documentIds: string[] | undefined;

      if (options.share.collectionId) {
        const sharedCollection =
          options.share.collection ??
          (await options.share.$get("collection", { scope: "unscoped" }));
        invariant(sharedCollection, "Cannot find collection for share");
        documentIds = sharedCollection.getAllDocumentIds();
      } else if (
        options.share.documentId &&
        options.share.includeChildDocuments
      ) {
        const sharedDocument = await options.share.$get("document");
        invariant(sharedDocument, "Cannot find document for share");

        const childDocumentIds = await sharedDocument.findAllChildDocumentIds({
          archivedAt: {
            [Op.is]: null,
          },
        });

        documentIds = [sharedDocument.id, ...childDocumentIds];
      }

      where[Op.and].push({
        id: documentIds,
      });
    }

    const findOptions = PostgresSearchProvider.buildFindOptions({
      query,
      sort: options.sort,
      direction: options.direction,
      usePopularityBoost: options.usePopularityBoost,
    });

    try {
      const results = await PostgresSearchProvider.findRankedResults({
        findOptions,
        where,
        limit,
        offset,
      });

      // Final query to get associated document data
      const [documents, count] = await Promise.all([
        Document.findAll({
          where: {
            id: map(results, "id"),
            teamId: team.id,
          },
          include: [
            {
              model: Collection,
              as: "collection",
            },
          ],
        }),
        PostgresSearchProvider.countResults({
          results,
          limit,
          offset,
          replacements: findOptions.replacements,
          where,
        }),
      ]);

      return PostgresSearchProvider.buildResponse({
        query,
        results,
        documents,
        count,
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("syntax error in tsquery")
      ) {
        throw ValidationError("Invalid search query");
      }
      throw err;
    }
  }

  async searchTitlesForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<Document[]> {
    const { limit = 15, offset = 0, query, ...rest } = options;
    const where = await PostgresSearchProvider.buildWhere(user, rest);

    if (query) {
      where[Op.and].push({
        title: { [Op.iLike]: QueryHelper.likeContains(query) },
      });
    }

    return Document.withMembershipScope(user.id, {
      includeDrafts: true,
    }).findAll({
      where,
      order: [
        [
          options.sort ?? SortFilter.UpdatedAt,
          options.direction ?? DirectionFilter.DESC,
        ],
      ],
      offset,
      limit,
    });
  }

  async searchCollectionsForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<Collection[]> {
    const { limit = 15, offset = 0, query } = options;

    const collectionIds = await user.collectionIds();

    return Collection.findAll({
      where: {
        [Op.and]: query
          ? {
              [Op.or]: [
                Sequelize.literal(
                  `unaccent(LOWER(name)) like unaccent(LOWER(:query))`
                ),
              ],
            }
          : {},
        id: collectionIds,
        teamId: user.teamId,
      },
      order: [["name", "ASC"]],
      replacements: { query: QueryHelper.likeContains(query ?? "") },
      limit,
      offset,
    });
  }

  async searchForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const { limit = 15, offset = 0, query } = options;

    const where = await PostgresSearchProvider.buildWhere(user, options);

    const findOptions = PostgresSearchProvider.buildFindOptions({
      query,
      sort: options.sort,
      direction: options.direction,
    });

    try {
      const results = await PostgresSearchProvider.findRankedResults({
        findOptions,
        where,
        limit,
        offset,
      });

      // Final query to get associated document data
      const [documents, count] = await Promise.all([
        Document.withMembershipScope(user.id, { includeDrafts: true }).findAll({
          where: {
            teamId: user.teamId,
            id: map(results, "id"),
          },
        }),
        PostgresSearchProvider.countResults({
          results,
          limit,
          offset,
          replacements: findOptions.replacements,
          where,
        }),
      ]);

      return PostgresSearchProvider.buildResponse({
        query,
        results,
        documents,
        count,
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("syntax error in tsquery")
      ) {
        throw ValidationError("Invalid search query");
      }
      throw err;
    }
  }

  /**
   * No-op for PostgreSQL — indexing is handled by database triggers.
   *
   * @param _model - unused.
   * @param _item - unused.
   */
  async index(
    _model: SearchableModel,
    _item: Document | Collection | Comment
  ): Promise<void> {
    // PostgreSQL uses tsvector triggers for indexing
  }

  /**
   * No-op for PostgreSQL — removal is handled by database cascades.
   *
   * @param _model - unused.
   * @param _id - unused.
   * @param _teamId - unused.
   */
  async remove(
    _model: SearchableModel,
    _id: string,
    _teamId: string
  ): Promise<void> {
    // PostgreSQL handles removal via cascading deletes
  }

  /**
   * No-op for PostgreSQL — metadata is stored in the same tables.
   *
   * @param _model - unused.
   * @param _id - unused.
   * @param _metadata - unused.
   */
  async updateMetadata(
    _model: SearchableModel,
    _id: string,
    _metadata: Record<string, unknown>
  ): Promise<void> {
    // PostgreSQL metadata lives in the same row as the document
  }

  /**
   * Executes the ranked search query inside a transaction opened on the
   * read-replica connection, offloading the most expensive query from the
   * primary. The transaction also ensures the statement timeout for
   * request-handling processes applies, cancelling a pathological query at
   * the database rather than letting it run unbounded.
   */
  private static findRankedResults({
    findOptions,
    where,
    limit,
    offset,
  }: {
    findOptions: FindOptions;
    where: WhereOptions<Document>;
    limit: number;
    offset: number;
  }): Promise<RankedDocument[]> {
    return sequelizeReadOnly.transaction(
      (transaction) =>
        Document.unscoped().findAll({
          ...findOptions,
          where,
          limit,
          offset,
          transaction,
        }) as unknown as Promise<RankedDocument[]>
    );
  }

  /**
   * Returns the total number of documents matching the search, avoiding a
   * second query over the search conditions when the requested page was not
   * filled and the total can be inferred.
   */
  private static countResults({
    results,
    limit,
    offset,
    replacements,
    where,
  }: {
    results: RankedDocument[];
    limit: number;
    offset: number;
    replacements?: BindOrReplacements;
    where: WhereOptions<Document>;
  }): Promise<number> {
    if (results.length < limit && (offset === 0 || results.length > 0)) {
      return Promise.resolve(offset + results.length);
    }

    return sequelizeReadOnly.transaction(
      (transaction) =>
        Document.unscoped().count({
          // @ts-expect-error Types are incorrect for count
          replacements,
          where,
          transaction,
        }) as unknown as Promise<number>
    );
  }

  private static buildFindOptions({
    query,
    sort,
    direction,
    usePopularityBoost = true,
  }: {
    query?: string;
    sort?: SortFilter;
    direction?: DirectionFilter;
    usePopularityBoost?: boolean;
  }): FindOptions {
    const attributes: FindAttributeOptions = ["id"];
    const replacements: BindOrReplacements = {};
    const order: Order = [];

    if (query) {
      const rankExpression = usePopularityBoost
        ? `ts_rank("searchVector", to_tsquery('english', :query)) * (1 + 0.25 * LN(1 + COALESCE("popularityScore", 0)))`
        : `ts_rank("searchVector", to_tsquery('english', :query))`;

      attributes.push([Sequelize.literal(rankExpression), "searchRanking"]);
      replacements["query"] = PostgresSearchProvider.webSearchQuery(query);
    }

    // When searching with a query and no explicit sort, prioritize search
    // ranking as the primary sort criterion. Otherwise, use the specified sort
    // with ranking as a tiebreaker.
    if (query && !sort) {
      order.push(["searchRanking", "DESC"]);
      order.push([SortFilter.UpdatedAt, DirectionFilter.DESC]);
    } else {
      const sortField = sort ?? SortFilter.UpdatedAt;
      const sortDirection = direction ?? DirectionFilter.DESC;

      if (sortField === SortFilter.Title) {
        order.push([
          Sequelize.fn("LOWER", Sequelize.col("title")),
          sortDirection,
        ]);
      } else {
        order.push([sortField, sortDirection]);
      }

      if (query) {
        order.push(["searchRanking", "DESC"]);
      }
    }

    return { attributes, replacements, order };
  }

  private static buildResultContext(document: Document, query: string) {
    // Reset regex lastIndex to avoid state issues with global regex
    PostgresSearchProvider.QUOTED_QUERY_REGEX.lastIndex = 0;
    const quotedQueries = Array.from(
      query.matchAll(PostgresSearchProvider.QUOTED_QUERY_REGEX)
    );
    const text = DocumentHelper.toPlainText(document);

    // Regex to highlight quoted queries as ts_headline will not do this by default due to stemming.
    const fullMatchRegex = new RegExp(escapeRegExp(query), "i");
    const highlightRegex = new RegExp(
      [
        fullMatchRegex.source,
        ...(quotedQueries.length
          ? quotedQueries.map((match) => escapeRegExp(match[1]))
          : PostgresSearchProvider.removeStopWords(query)
              .trim()
              .split(" ")
              .map((match) => `\\b${escapeRegExp(match)}\\b`)),
      ].join("|"),
      "gi"
    );

    // Reset regex lastIndex to avoid state issues with global regex
    PostgresSearchProvider.BREAK_CHARS_REGEX.lastIndex = 0;
    const breakCharsRegex = PostgresSearchProvider.BREAK_CHARS_REGEX;

    // chop text around the first match, prefer the first full match if possible.
    const fullMatchIndex = text.search(fullMatchRegex);
    const offsetStartIndex =
      (fullMatchIndex >= 0 ? fullMatchIndex : text.search(highlightRegex)) - 65;
    const startIndex = Math.max(
      0,
      offsetStartIndex <= 0
        ? 0
        : regexIndexOf(text, breakCharsRegex, offsetStartIndex)
    );
    // Ends on the last word boundary within the window, or at the window
    // itself when the text has none.
    const maxEndIndex = Math.min(text.length, startIndex + 250);
    const breakIndex = regexLastIndexOf(text, breakCharsRegex, maxEndIndex);
    const endIndex = breakIndex > startIndex ? breakIndex : maxEndIndex;

    // Highlight after slicing, as the inserted tags shift every index that
    // follows an earlier match.
    return text
      .slice(startIndex, endIndex)
      .replace(highlightRegex, "<b>$&</b>");
  }

  /**
   * AND a "published, non-archived" constraint into a filter expression.
   *
   * @param filter the filter to constrain, or undefined.
   * @returns a filter that always requires Published status.
   */
  private static withPublishedConstraint(filter: Filter | undefined): Filter {
    const publishedShape: Filter = {
      operator: "AND",
      filters: [
        { field: "archivedAt", operator: "isNull" },
        { field: "publishedAt", operator: "isNotNull" },
      ],
    };
    if (!filter) {
      return publishedShape;
    }
    return { operator: "AND", filters: [filter, publishedShape] };
  }

  private static async buildWhere(model: User | Team, options: SearchOptions) {
    const teamId = model instanceof Team ? model.id : model.teamId;
    const where: WhereOptions<Document> & {
      [Op.or]: WhereOptions<Document>[];
      [Op.and]: WhereOptions<Document>[];
    } = {
      teamId,
      [Op.or]: [],
      [Op.and]: [
        {
          deletedAt: {
            [Op.eq]: null,
          },
          template: false,
          sourceMetadata: {
            trial: {
              [Op.is]: null,
            },
          },
        },
      ],
    };

    const filter = options.filter;

    // A document is visible if any of:
    //
    //   - direct or group membership on the document
    //   - the user is the creator AND the doc has no collection (unplaced
    //     drafts that no membership/collection check can reach)
    //   - the doc is published AND lives in a collection the user can access
    //     (the common case for non-draft visibility)
    //   - the user is the creator AND the doc lives in a collection they can
    //     access (covers own drafts in shared collections — collection access
    //     alone does not grant visibility into other users' drafts)
    //
    // Membership and collection access are resolved to id lists upfront so the
    // search query needs no membership joins. Status/date narrowing is applied
    // separately via `filter`.
    //
    // For Team contexts (share-based search), the caller is privileged and has
    // done its own authorization — narrow to the filter's collectionId if
    // specified, otherwise to the team's publicly-permissioned set.
    if (model instanceof User) {
      const [membershipDocumentIds, collectionIds] = await Promise.all([
        Document.membershipDocumentIds(model.id),
        model.collectionIds(),
      ]);
      if (membershipDocumentIds.length) {
        where[Op.or].push({ id: membershipDocumentIds });
      }
      where[Op.or].push({
        createdById: model.id,
        collectionId: { [Op.is]: null },
      });
      if (collectionIds.length) {
        where[Op.or].push(
          {
            collectionId: collectionIds,
            publishedAt: { [Op.ne]: null },
          },
          {
            createdById: model.id,
            collectionId: collectionIds,
          }
        );
      }
    } else {
      const explicitCollectionIds = filter
        ? collectEqValues(filter, "collectionId")
        : [];
      const collectionIds = explicitCollectionIds.length
        ? explicitCollectionIds
        : await model.collectionIds();
      if (collectionIds.length) {
        where[Op.or].push({ collectionId: collectionIds });
      }
    }

    if (filter) {
      where[Op.and].push(buildSearchWhere<Document>(filter));
    }

    if (options.query) {
      // find words that look like urls, these should be treated separately as the postgres full-text
      // index will generally not match them.
      let likelyUrls = getUrls(options.query);

      // remove likely urls, and escape the rest of the query.
      let limitedQuery = PostgresSearchProvider.escapeQuery(
        likelyUrls
          .reduce((q, url) => q.replace(url, ""), options.query)
          .slice(0, PostgresSearchProvider.maxQueryLength)
          .trim()
      );

      // Escape the URLs
      likelyUrls = likelyUrls.map((url) =>
        PostgresSearchProvider.escapeQuery(url)
      );

      // Extract quoted queries and add them to the where clause, up to a maximum of 3 total.
      const quotedQueries = Array.from(limitedQuery.matchAll(/"([^"]*)"/g)).map(
        (match) => match[1]
      );

      // remove quoted queries from the limited query
      limitedQuery = limitedQuery.replace(/"([^"]*)"/g, "");

      const iLikeQueries = [...quotedQueries, ...likelyUrls].slice(0, 3);

      for (const match of iLikeQueries) {
        // only escape % and _ as backslashes were already escaped above.
        const pattern = `%${match.replace(/[%_]/g, "\\$&")}%`;
        where[Op.and].push({
          [Op.or]: [
            {
              title: {
                [Op.iLike]: pattern,
              },
            },
            {
              text: {
                [Op.iLike]: pattern,
              },
            },
          ],
        });
      }

      if (limitedQuery || iLikeQueries.length === 0) {
        where[Op.and].push(
          Sequelize.fn(
            `"searchVector" @@ to_tsquery`,
            "english",
            Sequelize.literal(":query")
          )
        );
      }
    }

    return where;
  }

  private static buildResponse({
    query,
    results,
    documents,
    count,
  }: {
    query?: string;
    results: RankedDocument[];
    documents: Document[];
    count: number;
  }): SearchResponse {
    return {
      results: compact(
        map(results, (result) => {
          const document = find(documents, {
            id: result.id,
          });

          // The ranked query may run on a read replica, so a document can be
          // returned that has since been removed on the primary.
          if (!document) {
            return null;
          }

          return {
            ranking: result.dataValues.searchRanking,
            context: query
              ? PostgresSearchProvider.buildResultContext(document, query)
              : undefined,
            document,
          };
        })
      ),
      total: count,
    };
  }

  /**
   * Convert a user search query into a format that can be used by Postgres.
   *
   * @param query - the user search query.
   * @returns the query formatted for Postgres ts_query.
   */
  public static webSearchQuery(query: string): string {
    // limit length of search queries as we're using regex against untrusted input
    let limitedQuery = query.slice(0, PostgresSearchProvider.maxQueryLength);

    const quotedSearch =
      limitedQuery.startsWith('"') && limitedQuery.endsWith('"');

    // Replace single quote characters with &.
    // Reset regex lastIndex to avoid state issues with global regex
    PostgresSearchProvider.SINGLE_QUOTE_REGEX.lastIndex = 0;
    const singleQuotes = limitedQuery.matchAll(
      PostgresSearchProvider.SINGLE_QUOTE_REGEX
    );

    for (const match of singleQuotes) {
      if (
        match.index &&
        match.index > 0 &&
        match.index < limitedQuery.length - 1
      ) {
        limitedQuery =
          limitedQuery.substring(0, match.index) +
          "&" +
          limitedQuery.substring(match.index + 1);
      }
    }

    // Escape only once the phrase delimiters above have settled.
    limitedQuery = PostgresSearchProvider.escapeTsQuery(limitedQuery);

    return (
      queryParser()(
        // Although queryParser trims the query, looks like there's a
        // bug for certain cases where it removes other characters in addition to
        // spaces. Ref: https://github.com/caub/pg-tsquery/issues/27
        quotedSearch ? limitedQuery.trim() : `${limitedQuery.trim()}*`
      )
        // Strip any trailing join (&) or escape (\) characters, in any
        // combination, so we never hand to_tsquery an operator with no
        // operand (e.g. a tail of "&\" would leave a dangling "&").
        .replace(/[&\\]+$/, "")
    );
  }

  private static escapeQuery(query: string): string {
    // replace "\" with escaped "\\" because sequelize.escape doesn't do it
    // see: https://github.com/sequelize/sequelize/issues/2950
    return query.replace(/\\/g, "\\\\");
  }

  /**
   * Escapes the characters that are reserved in tsquery, segment by segment so
   * that quoted phrases can be treated differently to the rest of the query.
   *
   * ":" only needs escaping inside a phrase, where pg-tsquery passes it through
   * verbatim (see: https://github.com/outline/outline/issues/6542). Elsewhere
   * pg-tsquery drops the colon but keeps a preceding backslash, which would
   * leave to_tsquery with a dangling escape character.
   */
  private static escapeTsQuery(query: string): string {
    return query.replace(/"[^"]*"|'[^']*'|[\s\S]/g, (segment) =>
      // a match longer than the single character fallback is a quoted phrase
      segment.length > 1
        ? segment.replace(/[\\:]/g, "\\$&")
        : segment.replace(/\\/g, "\\\\")
    );
  }

  private static removeStopWords(query: string): string {
    return query
      .split(" ")
      .filter((word) => !PostgresSearchProvider.STOP_WORDS.has(word))
      .join(" ");
  }
}
