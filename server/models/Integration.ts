import { DataTypes } from "sequelize";
import { ForeignKey, BelongsTo, Column, Table } from "sequelize-typescript";
import Collection from "./Collection";
import IntegrationAuthentication from "./IntegrationAuthentication";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";

@Table({ tableName: "integrations", modelName: "integration" })
class Integration extends BaseModel {
  @Column
  type: string;

  @Column
  service: string;

  @Column(DataTypes.JSONB)
  settings: any;

  @Column(DataTypes.ARRAY(DataTypes.STRING))
  events: string[];

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

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column
  collectionId: string;

  @BelongsTo(() => IntegrationAuthentication, "authenticationId")
  authentication: IntegrationAuthentication;

  @ForeignKey(() => IntegrationAuthentication)
  @Column
  authenticationId: string;
}

export default Integration;
