import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
  Unique,
} from "sequelize-typescript";
import encryptedFields from "@server/database/encryptedFields";
import AuthenticationProvider from "./AuthenticationProvider";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "user_authentications", modelName: "user_authentication" })
@Fix
class UserAuthentication extends BaseModel {
  @Column(DataType.ARRAY(DataType.STRING))
  scopes: string[];

  @Column(encryptedFields().vault("accessToken"))
  accessToken: string;

  @Column(encryptedFields().vault("refreshToken"))
  refreshToken: string;

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
