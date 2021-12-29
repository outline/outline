import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
  Unique,
} from "sequelize-typescript";
import AuthenticationProvider from "./AuthenticationProvider";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Encrypted, {
  getEncryptedColumn,
  setEncryptedColumn,
} from "./decorators/Encrypted";
import Fix from "./decorators/Fix";

@Table({ tableName: "user_authentications", modelName: "user_authentication" })
@Fix
class UserAuthentication extends BaseModel {
  @Column(DataType.ARRAY(DataType.STRING))
  scopes: string[];

  @Column(DataType.BLOB)
  @Encrypted
  get accessToken() {
    return getEncryptedColumn(this, "accessToken");
  }

  set accessToken(value: string) {
    setEncryptedColumn(this, "accessToken", value);
  }

  @Column(DataType.BLOB)
  @Encrypted
  get refreshToken() {
    return getEncryptedColumn(this, "refreshToken");
  }

  set refreshToken(value: string) {
    setEncryptedColumn(this, "refreshToken", value);
  }

  @Column
  providerId: string;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => AuthenticationProvider, "providerId")
  authenticationProvider: AuthenticationProvider;

  @ForeignKey(() => AuthenticationProvider)
  @Unique
  @Column(DataType.UUID)
  authenticationProviderId: string;
}

export default UserAuthentication;
