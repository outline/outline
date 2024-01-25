import removeMarkdown from "@tommoor/remove-markdown";
import invariant from "invariant";
import find from "lodash/find";
import map from "lodash/map";
import queryParser from "pg-tsquery";
import { Op, QueryTypes, Sequelize, WhereOptions } from "sequelize";
import { DateFilter } from "@shared/types";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import Share from "@server/models/Share";
import Team from "@server/models/Team";
import User from "@server/models/User";
import { sequelize } from "@server/storage/database";

type SearchResponse = {
  results: {
    /** The search ranking, for sorting results */
    ranking: number;
    /** A snippet of contextual text around the search result */
    context: string;
    /** The document result */
    document: Document;
  }[];
  /** The total number of results for the search query without pagination */
  totalCount: number;
};

type SearchOptions = {
  /** The query limit for pagination */
  limit?: number;
  /** The query offset for pagination */
  offset?: number;
  /** Limit results to a collection. Authorization is presumed to have been done before passing to this helper. */
  collectionId?: string | null;
  /** Limit results to a shared document. */
  share?: Share;
  /** Limit results to a date range. */
  dateFilter?: DateFilter;
  /** Limit results to a list of users that collaborated on the document. */
  collaboratorIds?: string[];
  /** Include archived documents in the results */
  includeArchived?: boolean;
  /** Include draft documents in the results (will only ever return your own) */
  includeDrafts?: boolean;
  /** The minimum number of words to be returned in the contextual snippet */
  snippetMinWords?: number;
  /** The maximum number of words to be returned in the contextual snippet */
  snippetMaxWords?: number;
};

type RankedDocument = Document & {
  searchRanking: number;
  searchContext: string;
  id: string;
};

export default class SearchHelper {
  /**
   * The maximum length of a search query.
   */
  public static maxQueryLength = 1000;

  public static async searchForTeam(
    team: Team,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const {
      snippetMinWords = 20,
      snippetMaxWords = 30,
      limit = 15,
      offset = 0,
    } = options;

    // restrict to specific collection if provided
    // enables search in private collections if specified
    let collectionIds: string[];
    if (options.collectionId) {
      collectionIds = [options.collectionId];
    } else {
      collectionIds = await team.collectionIds();
    }

    // short circuit if no relevant collections
    if (!collectionIds.length) {
      return {
        results: [],
        totalCount: 0,
      };
    }

    // restrict to documents in the tree of a shared document when one is provided
    let documentIds: string[] | undefined;

    if (options.share?.includeChildDocuments) {
      const sharedDocument = await options.share.$get("document");
      invariant(sharedDocument, "Cannot find document for share");

      const childDocumentIds = await sharedDocument.findAllChildDocumentIds({
        archivedAt: {
          [Op.is]: null,
        },
      });
      documentIds = [sharedDocument.id, ...childDocumentIds];
    }

    const documentClause = documentIds ? `"id" IN(:documentIds) AND` : "";

    // Build the SQL query to get result documentIds, ranking, and search term context
    const whereClause = `
    "searchVector" @@ to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "collectionId" IN(:collectionIds) AND
    ${documentClause}
    "deletedAt" IS NULL AND
    "publishedAt" IS NOT NULL
  `;
    const selectSql = `
    SELECT
      id,
      ts_rank(documents."searchVector", to_tsquery('english', :query)) as "searchRanking",
      ts_headline('english', "text", to_tsquery('english', :query), :headlineOptions) as "searchContext"
    FROM documents
    WHERE ${whereClause}
    ORDER BY
      "searchRanking" DESC,
      "updatedAt" DESC
    LIMIT :limit
    OFFSET :offset;
  `;
    const countSql = `
    SELECT COUNT(id)
    FROM documents
    WHERE ${whereClause}
  `;
    const queryReplacements = {
      teamId: team.id,
      query: this.webSearchQuery(query),
      collectionIds,
      documentIds,
      headlineOptions: `MaxFragments=1, MinWords=${snippetMinWords}, MaxWords=${snippetMaxWords}`,
    };
    const resultsQuery = sequelize.query<RankedDocument>(selectSql, {
      type: QueryTypes.SELECT,
      replacements: { ...queryReplacements, limit, offset },
    });
    const countQuery = sequelize.query<{ count: number }>(countSql, {
      type: QueryTypes.SELECT,
      replacements: queryReplacements,
    });
    const [results, [{ count }]] = await Promise.all([
      resultsQuery,
      countQuery,
    ]);

    // Final query to get associated document data
    const documents = await Document.findAll({
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
    });

    return SearchHelper.buildResponse(results, documents, count);
  }

  public static async searchTitlesForUser(
    user: User,
    query: string,
    options: SearchOptions = {}
  ): Promise<Document[]> {
    const { limit = 15, offset = 0 } = options;
    const where = await this.buildWhere(user, options);

    where[Op.and].push({
      title: {
        [Op.iLike]: `%${query}%`,
      },
    });

    const include = [
      {
        association: "memberships",
        where: {
          userId: user.id,
        },
        required: false,
        separate: false,
      },
      {
        model: User,
        as: "createdBy",
        paranoid: false,
      },
      {
        model: User,
        as: "updatedBy",
        paranoid: false,
      },
    ];

    return Document.scope([
      "withoutState",
      "withDrafts",
      {
        method: ["withViews", user.id],
      },
      {
        method: ["withCollectionPermissions", user.id],
      },
      {
        method: ["withMembership", user.id],
      },
    ]).findAll({
      where,
      subQuery: false,
      order: [["updatedAt", "DESC"]],
      include,
      offset,
      limit,
    });
  }

  public static async searchForUser(
    user: User,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const {
      snippetMinWords = 20,
      snippetMaxWords = 30,
      limit = 15,
      offset = 0,
    } = options;

    const where = await this.buildWhere(user, options);

    where[Op.and].push(
      Sequelize.fn(
        `"searchVector" @@ to_tsquery`,
        "english",
        Sequelize.literal(":query")
      )
    );

    const queryReplacements = {
      query: this.webSearchQuery(query),
      headlineOptions: `MaxFragments=1, MinWords=${snippetMinWords}, MaxWords=${snippetMaxWords}`,
    };

    const include = [
      {
        association: "memberships",
        where: {
          userId: user.id,
        },
        required: false,
        separate: false,
      },
    ];

    const resultsQuery = Document.unscoped().findAll({
      attributes: [
        "id",
        [
          Sequelize.literal(
            `ts_rank("searchVector", to_tsquery('english', :query))`
          ),
          "searchRanking",
        ],
        [
          Sequelize.literal(
            `ts_headline('english', "text", to_tsquery('english', :query), :headlineOptions)`
          ),
          "searchContext",
        ],
      ],
      subQuery: false,
      include,
      replacements: queryReplacements,
      where,
      order: [
        ["searchRanking", "DESC"],
        ["updatedAt", "DESC"],
      ],
      limit,
      offset,
    }) as any as Promise<RankedDocument[]>;

    const countQuery = Document.unscoped().count({
      // @ts-expect-error Types are incorrect for count
      subQuery: false,
      include,
      replacements: queryReplacements,
      where,
    }) as any as Promise<number>;
    const [results, count] = await Promise.all([resultsQuery, countQuery]);

    // Final query to get associated document data
    const documents = await Document.scope([
      "withoutState",
      "withDrafts",
      {
        method: ["withViews", user.id],
      },
      {
        method: ["withCollectionPermissions", user.id],
      },
      {
        method: ["withMembership", user.id],
      },
    ]).findAll({
      where: {
        teamId: user.teamId,
        id: map(results, "id"),
      },
    });

    return SearchHelper.buildResponse(results, documents, count);
  }

  private static async buildWhere(user: User, options: SearchOptions) {
    const where: WhereOptions<Document> = {
      teamId: user.teamId,
      [Op.or]: [
        { collectionId: { [Op.eq]: null }, createdById: user.id },
        { "$memberships.id$": { [Op.ne]: null } },
      ],
      [Op.and]: [],
    };

    // Ensure we're filtering by the users accessible collections. If
    // collectionId is passed as an option it is assumed that the authorization
    // has already been done in the router
    const collectionIds = options.collectionId
      ? [options.collectionId]
      : await user.collectionIds();

    if (collectionIds.length) {
      where[Op.or].push({ collectionId: collectionIds });
    }

    if (options.dateFilter) {
      where[Op.and].push({
        updatedAt: {
          [Op.gt]: sequelize.literal(
            `now() - interval '1 ${options.dateFilter}'`
          ),
        },
      });
    }

    if (options.collaboratorIds) {
      where[Op.and].push({
        collaboratorIds: {
          [Op.contains]: options.collaboratorIds,
        },
      });
    }

    if (!options.includeArchived) {
      where[Op.and].push({
        archivedAt: {
          [Op.eq]: null,
        },
      });
    }

    if (options.includeDrafts) {
      where[Op.and].push({
        [Op.or]: [
          {
            publishedAt: {
              [Op.ne]: null,
            },
          },
          {
            createdById: user.id,
          },
          { "$memberships.id$": { [Op.ne]: null } },
        ],
      });
    } else {
      where[Op.and].push({
        publishedAt: {
          [Op.ne]: null,
        },
      });
    }

    return where;
  }

  private static buildResponse(
    results: RankedDocument[],
    documents: Document[],
    count: number
  ): SearchResponse {
    return {
      results: map(results, (result) => ({
        ranking: result.searchRanking,
        context: removeMarkdown(result.searchContext, {
          stripHTML: false,
        }),
        document: find(documents, {
          id: result.id,
        }) as Document,
      })),
      totalCount: count,
    };
  }

  /**
   * Convert a user search query into a format that can be used by Postgres
   *
   * @param query The user search query
   * @returns The query formatted for Postgres ts_query
   */
  public static webSearchQuery(query: string): string {
    // limit length of search queries as we're using regex against untrusted input
    let limitedQuery = this.escapeQuery(query.slice(0, this.maxQueryLength));

    // if the search term is one unquoted word then allow partial matches automatically
    const queryWordCount = limitedQuery.split(" ").length;
    const singleUnquotedSearch =
      queryWordCount === 1 &&
      !limitedQuery.startsWith('"') &&
      !limitedQuery.endsWith('"');

    // Replace single quote characters with &.
    const singleQuotes = limitedQuery.matchAll(/'+/g);

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

    return (
      queryParser()(singleUnquotedSearch ? `${limitedQuery}*` : limitedQuery)
        // Remove any trailing join characters
        .replace(/&$/, "")
    );
  }

  private static escapeQuery(query: string): string {
    // replace "\" with escaped "\\" because sequelize.escape doesn't do it
    // https://github.com/sequelize/sequelize/issues/2950
    return query.replace(/\\/g, "\\\\");
  }
}
