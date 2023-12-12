import {
  Table,
  ForeignKey,
  Model,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  BelongsTo,
  DataType,
  Default,
} from "sequelize-typescript";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";

@Table({
  tableName: "search_queries",
  modelName: "search_query",
  updatedAt: false,
})
@Fix
class SearchQuery extends Model {
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
  @Column(DataType.ENUM("slack", "app", "api"))
  source: string;

  /**
   * The number of results returned for this query.
   */
  @Column
  results: number;

  /**
   * User score for the results for this query, -1 for negative, 1 for positive, null for neutral.
   */
  @Column
  score: number;

  /**
   * The generated answer to the query, if any.
   */
  @Column
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
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default SearchQuery;
