import {
  DataType,
  Table,
  ForeignKey,
  BelongsTo,
  Column,
} from "sequelize-typescript";
import encryptedFields from "@server/database/encryptedFields";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "authentications", modelName: "authentication" })
@Fix
class IntegrationAuthentication extends BaseModel {
  @Column
  service: string;

  @Column(DataType.ARRAY(DataType.STRING))
  scopes: string[];

  @Column(encryptedFields().vault("token"))
  token: string;

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

export default IntegrationAuthentication;
