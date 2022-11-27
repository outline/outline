import removeMarkdown from "@tommoor/remove-markdown";
import invariant from "invariant";
import { find, map } from "lodash";
import { Op, QueryTypes } from "sequelize";
import { DateFilter } from "@shared/types";
import unescape from "@shared/utils/unescape";
import { sequelize } from "@server/database/sequelize";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import Share from "@server/models/Share";
import Team from "@server/models/Team";
import User from "@server/models/User";

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
  collectionId?: string;
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

type Results = {
  searchRanking: number;
  searchContext: string;
  id: string;
};

export default class SearchHelper {
  public static async searchForTeam(
    team: Team,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const wildcardQuery = `${this.escapeQuery(query)}:*`;
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

      const childDocumentIds = await sharedDocument.getChildDocumentIds({
        archivedAt: {
          [Op.is]: null,
        },
      });
      documentIds = [sharedDocument.id, ...childDocumentIds];
    }

    const documentClause = documentIds ? `"id" IN(:documentIds) AND` : "";

    // Build the SQL query to get result documentIds, ranking, and search term context
    const whereClause = `
    "searchVector" @@ websearch_to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "collectionId" IN(:collectionIds) AND
    ${documentClause}
    "deletedAt" IS NULL AND
    "publishedAt" IS NOT NULL
  `;
    const selectSql = `
    SELECT
      id,
      ts_rank(documents."searchVector", websearch_to_tsquery('english', :query)) as "searchRanking",
      ts_headline('english', "text", websearch_to_tsquery('english', :query), :headlineOptions) as "searchContext"
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
      query: wildcardQuery,
      collectionIds,
      documentIds,
      headlineOptions: `MaxFragments=1, MinWords=${snippetMinWords}, MaxWords=${snippetMaxWords}`,
    };
    const resultsQuery = sequelize.query<Results>(selectSql, {
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
    const wildcardQuery = `${SearchHelper.escapeQuery(query)}:*`;

    // Ensure we're filtering by the users accessible collections. If
    // collectionId is passed as an option it is assumed that the authorization
    // has already been done in the router
    let collectionIds;

    if (options.collectionId) {
      collectionIds = [options.collectionId];
    } else {
      collectionIds = await user.collectionIds();
    }

    let dateFilter;

    if (options.dateFilter) {
      dateFilter = `1 ${options.dateFilter}`;
    }

    // Build the SQL query to get documentIds, ranking, and search term context
    const whereClause = `
    "searchVector" @@ websearch_to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    ${
      collectionIds.length
        ? `(
          "collectionId" IN(:collectionIds) OR
          ("collectionId" IS NULL AND "createdById" = :userId)
        ) AND`
        : '"collectionId" IS NULL AND "createdById" = :userId AND'
    }
    ${
      options.dateFilter ? '"updatedAt" > now() - interval :dateFilter AND' : ""
    }
    ${
      options.collaboratorIds
        ? '"collaboratorIds" @> ARRAY[:collaboratorIds]::uuid[] AND'
        : ""
    }
    ${options.includeArchived ? "" : '"archivedAt" IS NULL AND'}
    "deletedAt" IS NULL AND
    ${
      options.includeDrafts
        ? '("publishedAt" IS NOT NULL OR "createdById" = :userId)'
        : '"publishedAt" IS NOT NULL'
    }
  `;
    const selectSql = `
  SELECT
    id,
    ts_rank(documents."searchVector", websearch_to_tsquery('english', :query)) as "searchRanking",
    ts_headline('english', "text", websearch_to_tsquery('english', :query), :headlineOptions) as "searchContext"
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
      teamId: user.teamId,
      userId: user.id,
      collaboratorIds: options.collaboratorIds,
      query: wildcardQuery,
      collectionIds,
      dateFilter,
      headlineOptions: `MaxFragments=1, MinWords=${snippetMinWords}, MaxWords=${snippetMaxWords}`,
    };
    const resultsQuery = sequelize.query<Results>(selectSql, {
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
    const documents = await Document.scope([
      "withoutState",
      "withDrafts",
      {
        method: ["withViews", user.id],
      },
      {
        method: ["withCollectionPermissions", user.id],
      },
    ]).findAll({
      where: {
        teamId: user.teamId,
        id: map(results, "id"),
      },
    });

    return SearchHelper.buildResponse(results, documents, count);
  }

  private static buildResponse(
    results: Results[],
    documents: Document[],
    count: number
  ): SearchResponse {
    return {
      results: map(results, (result) => ({
        ranking: result.searchRanking,
        context: removeMarkdown(unescape(result.searchContext), {
          stripHTML: false,
        }),
        document: find(documents, {
          id: result.id,
        }) as Document,
      })),
      totalCount: count,
    };
  }

  private static escapeQuery(query: string): string {
    // replace "\" with escaped "\\" because sequelize.escape doesn't do it
    // https://github.com/sequelize/sequelize/issues/2950
    return sequelize.escape(query).replace(/\\/g, "\\\\");
  }
}
