import { DataTypes } from "sequelize";
import { Table, ForeignKey, BelongsTo, Column } from "sequelize-typescript";
import encryptedFields from "@server/database/encryptedFields";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";

@Table({ tableName: "authentications", modelName: "authentication" })
class IntegrationAuthentication extends BaseModel {
  @Column
  service: string;

  @Column(DataTypes.ARRAY(DataTypes.STRING))
  scopes: string[];

  @Column(encryptedFields().vault("token"))
  token: string;

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

export default IntegrationAuthentication;
