import {
  ForeignKey,
  BelongsTo,
  Column,
  Table,
  DataType,
} from "sequelize-typescript";
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

  @Column(DataType.JSONB)
  settings: any;

  @Column(DataType.ARRAY(DataType.STRING))
  events: string[];

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

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  @BelongsTo(() => IntegrationAuthentication, "authenticationId")
  authentication: IntegrationAuthentication;

  @ForeignKey(() => IntegrationAuthentication)
  @Column(DataType.UUID)
  authenticationId: string;
}

export default Integration;
