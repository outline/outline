import { DataTypes } from "sequelize";
import {
  Table,
  ForeignKey,
  Model,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  BelongsTo,
} from "sequelize-typescript";
import Team from "./Team";
import User from "./User";

@Table({ tableName: "search_queries", modelName: "search_query" })
class SearchQuery extends Model {
  @IsUUID(4)
  @Column
  @PrimaryKey
  id: string;

  @CreatedAt
  createdAt: Date;

  @Column(DataTypes.ENUM("slack", "app", "api"))
  source: string;

  @Column(DataTypes.STRING)
  set query(value: string) {
    this.setDataValue("query", value.substring(0, 255));
  }

  get query() {
    return this.getDataValue("query");
  }

  @Column
  results: number;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;
}

export default SearchQuery;
