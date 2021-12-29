import {
  DataType,
  Table,
  ForeignKey,
  BelongsTo,
  Column,
} from "sequelize-typescript";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Encrypted, {
  getEncryptedColumn,
  setEncryptedColumn,
} from "./decorators/Encrypted";
import Fix from "./decorators/Fix";

@Table({ tableName: "authentications", modelName: "authentication" })
@Fix
class IntegrationAuthentication extends BaseModel {
  @Column
  service: string;

  @Column(DataType.ARRAY(DataType.STRING))
  scopes: string[];

  @Column(DataType.BLOB)
  @Encrypted
  get token() {
    return getEncryptedColumn(this, "token");
  }

  set token(value: string) {
    setEncryptedColumn(this, "token", value);
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

export default IntegrationAuthentication;
