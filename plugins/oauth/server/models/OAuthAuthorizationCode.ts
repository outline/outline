import { Matches } from "class-validator";
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
import User from "@server/models/User";
import IdModel from "@server/models/base/IdModel";
import { SkipChangeset } from "@server/models/decorators/Changeset";
import Fix from "@server/models/decorators/Fix";
import OAuthClient from "./OAuthClient";

@Table({
  tableName: "oauth_authorization_codes",
  modelName: "oauth_authorization_code",
  updatedAt: false,
})
@Fix
class OAuthAuthorizationCode extends IdModel<
  InferAttributes<OAuthAuthorizationCode>,
  Partial<InferCreationAttributes<OAuthAuthorizationCode>>
> {
  @Column
  @SkipChangeset
  authorizationCodeHash: string;

  /** A list of scopes that this authorization code has access to */
  @Matches(/[\/\.\w\s]*/, {
    each: true,
  })
  @Column(DataType.ARRAY(DataType.STRING))
  scope: string[];

  @Length({ max: OAuthClientValidation.maxRedirectUriLength })
  @Column
  redirectUri: string;

  @Column(DataType.DATE)
  expiresAt: Date;

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
