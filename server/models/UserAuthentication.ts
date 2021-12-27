import {
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  Unique,
} from "sequelize-typescript";
import { encryptedFields } from "@server/sequelize";
import AuthenticationProvider from "./AuthenticationProvider";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";

@Table({ tableName: "user_authentications", modelName: "user_authentication" })
class UserAuthentication extends ParanoidModel {
  @Column
  scopes: string[];

  @Column(encryptedFields().vault("accessToken"))
  accessToken: string;

  @Column(encryptedFields().vault("refreshToken"))
  refreshToken: string;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  @BelongsTo(() => AuthenticationProvider, "providerId")
  authenticationProvider: AuthenticationProvider;

  @Column
  @Unique
  @ForeignKey(() => AuthenticationProvider)
  authenticationProviderId: string;
}

export default UserAuthentication;
