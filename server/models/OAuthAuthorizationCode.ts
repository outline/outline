import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  Length,
} from "sequelize-typescript";
import { OAuthClientValidation } from "@shared/validations";
import OAuthClient from "./OAuthClient";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({
  tableName: "oauth_authorization_codes",
  modelName: "oauth_authorization_code",
  timestamps: false,
})
@Fix
class OAuthAuthorizationCode extends IdModel<
  InferAttributes<OAuthAuthorizationCode>,
  Partial<InferCreationAttributes<OAuthAuthorizationCode>>
> {
  @Column
  authorizationCodeHash: string;

  @Column
  scope: string;

  @Length({ max: OAuthClientValidation.maxRedirectUriLength })
  @Column
  redirectUri: string;

  @Column(DataType.DATE)
  expiresAt: Date;

  @Column(DataType.DATE)
  createdAt: Date;

  // associations

  @BelongsTo(() => OAuthClient, "oauthClientId")
  oauthClient: OAuthClient;

  @ForeignKey(() => OAuthClient)
  @Column(DataType.UUID)
  oauthClientId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;
}

export default OAuthAuthorizationCode;
