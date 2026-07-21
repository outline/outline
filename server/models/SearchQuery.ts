import { Op } from "sequelize";
import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Table,
  ForeignKey,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  BelongsTo,
  DataType,
  Default,
} from "sequelize-typescript";
import { Second } from "@shared/utils/time";
import Share from "@server/models/Share";
import Team from "@server/models/Team";
import User from "@server/models/User";
import Model from "@server/models/base/Model";
import Fix from "./decorators/Fix";

/**
 * Where a search query originated.
 */
export enum SearchQuerySource {
  Slack = "slack",
  App = "app",
  API = "api",
  OAuth = "oauth",
  MCP = "mcp",
}

@Table({
  tableName: "search_queries",
  modelName: "search_query",
  updatedAt: false,
})
@Fix
class SearchQuery extends Model<
  InferAttributes<SearchQuery>,
  Partial<InferCreationAttributes<SearchQuery>>
> {
  /**
   * The window during which a follow-up query for the same scope is treated as
   * a continuation of the same "search as you type" session rather than a new
   * search.
   */
  public static recencyWindow = Second.ms * 30;

  /**
   * Records a search query, collapsing rapid "search as you type" keystrokes
   * into a single record. If a query was recorded for the same scope within the
   * recency window and one query is a prefix of the other (i.e. the visitor kept
   * typing or edited their term), the existing record is updated in place rather
   * than inserting a new row.
   *
   * @param attrs the attributes of the search to record.
   * @returns the created or updated search query record.
   */
  public static async record(attrs: {
    userId?: string | null;
    teamId: string;
    shareId?: string | null;
    source: SearchQuerySource;
    query: string;
    results: number;
    duration: number;
  }): Promise<SearchQuery> {
    const { userId, teamId, shareId, source, query, results, duration } = attrs;

    // Without a user or share to scope by, collapsing would merge unrelated
    // searches across the team, so only ever record a new row.
    const existing =
      userId || shareId
        ? await this.findOne({
            where: {
              teamId,
              userId: userId ?? null,
              shareId: shareId ?? null,
              source,
              createdAt: {
                [Op.gte]: new Date(Date.now() - SearchQuery.recencyWindow),
              },
            },
            order: [["createdAt", "DESC"]],
          })
        : null;

    if (
      existing &&
      (query.startsWith(existing.query) || existing.query.startsWith(query))
    ) {
      existing.query = query;
      existing.results = results;
      existing.duration = duration;
      return existing.save();
    }

    return this.create({
      userId,
      teamId,
      shareId,
      source,
      query,
      results,
      duration,
    });
  }

  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @CreatedAt
  createdAt: Date;

  /**
   * Where the query originated.
   */
  @Column(DataType.ENUM(...Object.values(SearchQuerySource)))
  source: SearchQuerySource;

  /**
   * The number of results returned for this query.
   */
  @Column(DataType.INTEGER)
  results: number;

  /**
   * How long the search took to execute, in milliseconds.
   */
  @Column(DataType.INTEGER)
  duration: number;

  /**
   * User score for the results for this query, -1 for negative, 1 for positive, null for neutral.
   */
  @Column(DataType.INTEGER)
  score: number;

  /**
   * The generated answer to the query, if any.
   */
  @Column(DataType.STRING)
  answer: string;

  /**
   * The query string, automatically truncated to 255 characters.
   */
  @Column(DataType.STRING)
  set query(value: string) {
    this.setDataValue("query", value.substring(0, 255));
  }

  get query() {
    return this.getDataValue("query");
  }

  // associations

  @BelongsTo(() => User, "userId")
  user?: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId?: string | null;

  @BelongsTo(() => Share, "shareId")
  share?: Share | null;

  @ForeignKey(() => Share)
  @Column(DataType.UUID)
  shareId?: string | null;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default SearchQuery;
