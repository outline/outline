import invariant from "invariant";
import escapeRegExp from "lodash/escapeRegExp";
import find from "lodash/find";
import map from "lodash/map";
import queryParser from "pg-tsquery";
import {
  BindOrReplacements,
  FindAttributeOptions,
  FindOptions,
  Op,
  Order,
  Sequelize,
  WhereOptions,
} from "sequelize";
import { DateFilter, StatusFilter } from "@shared/types";
import { regexIndexOf, regexLastIndexOf } from "@shared/utils/string";
import { getUrls } from "@shared/utils/urls";
import { ValidationError } from "@server/errors";
import Collection from "@server/models/Collection";
import Document from "@server/models/Document";
import Share from "@server/models/Share";
import Team from "@server/models/Team";
import User from "@server/models/User";
import { sequelize } from "@server/storage/database";
import { DocumentHelper } from "./DocumentHelper";

type SearchResponse = {
  results: {
    /** The search ranking, for sorting results */
    ranking: number;
    /** A snippet of contextual text around the search result */
    context?: string;
    /** The document result */
    document: Document;
  }[];
  /** The total number of results for the search query without pagination */
  total: number;
};

type SearchOptions = {
  /** The query limit for pagination */
  limit?: number;
  /** The query offset for pagination */
  offset?: number;
  /** The text to search for */
  query?: string;
  /** Limit results to a collection. Authorization is presumed to have been done before passing to this helper. */
  collectionId?: string | null;
  /** Limit results to a shared document. */
  share?: Share;
  /** Limit results to a date range. */
  dateFilter?: DateFilter;
  /** Status of the documents to return */
  statusFilter?: StatusFilter[];
  /** Limit results to a list of documents. */
  documentIds?: string[];
  /** Limit results to a list of users that collaborated on the document. */
  collaboratorIds?: string[];
  /** The minimum number of words to be returned in the contextual snippet */
  snippetMinWords?: number;
  /** The maximum number of words to be returned in the contextual snippet */
  snippetMaxWords?: number;
};

type RankedDocument = Document & {
  id: string;
  dataValues: Partial<Document> & {
    searchRanking: number;
  };
};

export default class SearchHelper {
  /**
   * The maximum length of a search query.
   */
  public static maxQueryLength = 1000;

  public static async searchForTeam(
    team: Team,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const { limit = 15, offset = 0, query } = options;

    const where = await this.buildWhere(team, {
      ...options,
      statusFilter: [...(options.statusFilter || []), StatusFilter.Published],
    });

    if (options.share?.includeChildDocuments) {
      const sharedDocument = await options.share.$get("document");
      invariant(sharedDocument, "Cannot find document for share");

      const childDocumentIds = await sharedDocument.findAllChildDocumentIds({
        archivedAt: {
          [Op.is]: null,
        },
      });

      where[Op.and].push({
        id: [sharedDocument.id, ...childDocumentIds],
      });
    }

    const findOptions = this.buildFindOptions(query);

    try {
      const resultsQuery = Document.unscoped().findAll({
        ...findOptions,
        where,
        limit,
        offset,
      }) as any as Promise<RankedDocument[]>;

      const countQuery = Document.unscoped().count({
        // @ts-expect-error Types are incorrect for count
        replacements: findOptions.replacements,
        where,
      }) as any as Promise<number>;
      const [results, count] = await Promise.all([resultsQuery, countQuery]);

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

      return this.buildResponse({
        query,
        results,
        documents,
        count,
      });
    } catch (err) {
      if (err.message.includes("syntax error in tsquery")) {
        throw ValidationError("Invalid search query");
      }
      throw err;
    }
  }

  public static async searchTitlesForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<Document[]> {
    const { limit = 15, offset = 0, query, ...rest } = options;
    const where = await this.buildWhere(user, rest);

    if (query) {
      where[Op.and].push({
        title: {
          [Op.iLike]: `%${query}%`,
        },
      });
    }

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

    return Document.withMembershipScope(user.id, {
      includeDrafts: true,
    }).findAll({
      where,
      subQuery: false,
      order: [["updatedAt", "DESC"]],
      include,
      offset,
      limit,
    });
  }

  public static async searchCollectionsForUser(
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
      replacements: { query: `%${query}%` },
      limit,
      offset,
    });
  }

  public static async searchForUser(
    user: User,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const { limit = 15, offset = 0, query } = options;

    const where = await this.buildWhere(user, options);

    const findOptions = this.buildFindOptions(query);

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

    try {
      const results = (await Document.unscoped().findAll({
        ...findOptions,
        subQuery: false,
        include,
        where,
        limit,
        offset,
      })) as any as RankedDocument[];

      const countQuery = Document.unscoped().count({
        // @ts-expect-error Types are incorrect for count
        subQuery: false,
        include,
        replacements: findOptions.replacements,
        where,
      }) as any as Promise<number>;

      // Final query to get associated document data
      const [documents, count] = await Promise.all([
        Document.withMembershipScope(user.id, { includeDrafts: true }).findAll({
          where: {
            teamId: user.teamId,
            id: map(results, "id"),
          },
        }),
        results.length < limit && offset === 0
          ? Promise.resolve(results.length)
          : countQuery,
      ]);

      return this.buildResponse({
        query,
        results,
        documents,
        count,
      });
    } catch (err) {
      if (err.message.includes("syntax error in tsquery")) {
        throw ValidationError("Invalid search query");
      }
      throw err;
    }
  }

  private static buildFindOptions(query?: string): FindOptions {
    const attributes: FindAttributeOptions = ["id"];
    const replacements: BindOrReplacements = {};
    const order: Order = [["updatedAt", "DESC"]];

    if (query) {
      attributes.push([
        Sequelize.literal(
          `ts_rank("searchVector", to_tsquery('english', :query))`
        ),
        "searchRanking",
      ]);
      replacements["query"] = this.webSearchQuery(query);
      order.unshift(["searchRanking", "DESC"]);
    }

    return { attributes, replacements, order };
  }

  private static buildResultContext(document: Document, query: string) {
    const quotedQueries = Array.from(query.matchAll(/"([^"]*)"/g));
    const text = DocumentHelper.toPlainText(document);

    // Regex to highlight quoted queries as ts_headline will not do this by default due to stemming.
    const fullMatchRegex = new RegExp(escapeRegExp(query), "i");
    const highlightRegex = new RegExp(
      [
        fullMatchRegex.source,
        ...(quotedQueries.length
          ? quotedQueries.map((match) => escapeRegExp(match[1]))
          : this.removeStopWords(query)
              .trim()
              .split(" ")
              .map((match) => `\\b${escapeRegExp(match)}\\b`)),
      ].join("|"),
      "gi"
    );

    // Breaking characters
    const breakChars = [
      " ",
      ".",
      ",",
      `"`,
      "'",
      "\n",
      "。",
      "！",
      "？",
      "!",
      "?",
      "…",
    ];
    const breakCharsRegex = new RegExp(`[${breakChars.join("")}]`, "g");

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
    const context = text.replace(highlightRegex, "<b>$&</b>");
    const endIndex = regexLastIndexOf(
      context,
      breakCharsRegex,
      startIndex + 250
    );

    return context.slice(startIndex, endIndex);
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
        },
      ],
    };

    if (model instanceof User) {
      where[Op.or].push({ "$memberships.id$": { [Op.ne]: null } });
    }

    // Ensure we're filtering by the users accessible collections. If
    // collectionId is passed as an option it is assumed that the authorization
    // has already been done in the router
    const collectionIds = options.collectionId
      ? [options.collectionId]
      : await model.collectionIds();

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

    if (options.documentIds) {
      where[Op.and].push({
        id: options.documentIds,
      });
    }

    const statusQuery = [];
    if (options.statusFilter?.includes(StatusFilter.Published)) {
      statusQuery.push({
        [Op.and]: [
          {
            publishedAt: {
              [Op.ne]: null,
            },
            archivedAt: {
              [Op.eq]: null,
            },
          },
        ],
      });
    }

    if (
      options.statusFilter?.includes(StatusFilter.Draft) &&
      // Only ever include draft results for the user's own documents
      model instanceof User
    ) {
      statusQuery.push({
        [Op.and]: [
          {
            publishedAt: {
              [Op.eq]: null,
            },
            archivedAt: {
              [Op.eq]: null,
            },
            [Op.or]: [
              { createdById: model.id },
              { "$memberships.id$": { [Op.ne]: null } },
            ],
          },
        ],
      });
    }

    if (options.statusFilter?.includes(StatusFilter.Archived)) {
      statusQuery.push({
        archivedAt: {
          [Op.ne]: null,
        },
      });
    }

    if (statusQuery.length) {
      where[Op.and].push({
        [Op.or]: statusQuery,
      });
    }

    if (options.query) {
      // find words that look like urls, these should be treated separately as the postgres full-text
      // index will generally not match them.
      const likelyUrls = getUrls(options.query);

      // remove likely urls, and escape the rest of the query.
      let limitedQuery = this.escapeQuery(
        likelyUrls
          .reduce((q, url) => q.replace(url, ""), options.query)
          .slice(0, this.maxQueryLength)
          .trim()
      );

      // Extract quoted queries and add them to the where clause, up to a maximum of 3 total.
      const quotedQueries = Array.from(limitedQuery.matchAll(/"([^"]*)"/g)).map(
        (match) => match[1]
      );

      // remove quoted queries from the limited query
      limitedQuery = limitedQuery.replace(/"([^"]*)"/g, "");

      const iLikeQueries = [...quotedQueries, ...likelyUrls].slice(0, 3);

      for (const match of iLikeQueries) {
        where[Op.and].push({
          [Op.or]: [
            {
              title: {
                [Op.iLike]: `%${match}%`,
              },
            },
            {
              text: {
                [Op.iLike]: `%${match}%`,
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
      results: map(results, (result) => {
        const document = find(documents, {
          id: result.id,
        }) as Document;

        return {
          ranking: result.dataValues.searchRanking,
          context: query ? this.buildResultContext(document, query) : undefined,
          document,
        };
      }),
      total: count,
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

    const quotedSearch =
      limitedQuery.startsWith('"') && limitedQuery.endsWith('"');

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
      queryParser()(
        // Although queryParser trims the query, looks like there's a
        // bug for certain cases where it removes other characters in addition to
        // spaces. Ref: https://github.com/caub/pg-tsquery/issues/27
        quotedSearch ? limitedQuery.trim() : `${limitedQuery.trim()}*`
      )
        // Remove any trailing join characters
        .replace(/&$/, "")
        // Remove any trailing escape characters
        .replace(/\\$/, "")
    );
  }

  private static escapeQuery(query: string): string {
    return (
      query
        // replace "\" with escaped "\\" because sequelize.escape doesn't do it
        // see: https://github.com/sequelize/sequelize/issues/2950
        .replace(/\\/g, "\\\\")
        // replace ":" with escaped "\:" because it's a reserved character in tsquery
        // see: https://github.com/outline/outline/issues/6542
        .replace(/:/g, "\\:")
    );
  }

  private static removeStopWords(query: string): string {
    // Based on:
    // https://github.com/postgres/postgres/blob/fc0d0ce978752493868496be6558fa17b7c4c3cf/src/backend/snowball/stopwords/english.stop
    const stopwords = [
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
    ];
    return query
      .split(" ")
      .filter((word) => !stopwords.includes(word))
      .join(" ");
  }
}
