import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  DataType,
  Table,
  ForeignKey,
  BelongsTo,
  Column,
} from "sequelize-typescript";
import { IntegrationService } from "@shared/types";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Encrypted, {
  getEncryptedColumn,
  setEncryptedColumn,
} from "./decorators/Encrypted";
import Fix from "./decorators/Fix";

@Table({ tableName: "authentications", modelName: "authentication" })
@Fix
class IntegrationAuthentication extends IdModel<
  InferAttributes<IntegrationAuthentication>,
  Partial<InferCreationAttributes<IntegrationAuthentication>>
> {
  @Column(DataType.STRING)
  service: IntegrationService;

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

  @Column(DataType.BLOB)
  @Encrypted
  get refreshToken() {
    return getEncryptedColumn(this, "refreshToken");
  }

  set refreshToken(value: string) {
    setEncryptedColumn(this, "refreshToken", value);
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
