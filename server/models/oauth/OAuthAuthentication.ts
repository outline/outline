import { Matches } from "class-validator";
import { subMinutes } from "date-fns";
import {
  FindOptions,
  InferAttributes,
  InferCreationAttributes,
  NonNullFindOptions,
} from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  BeforeCreate,
  IsDate,
  Unique,
} from "sequelize-typescript";
import User from "@server/models/User";
import ParanoidModel from "@server/models/base/ParanoidModel";
import { SkipChangeset } from "@server/models/decorators/Changeset";
import Fix from "@server/models/decorators/Fix";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import { hash } from "@server/utils/crypto";
import OAuthClient from "./OAuthClient";

@Table({
  tableName: "oauth_authentications",
  modelName: "oauth_authentication",
})
@Fix
class OAuthAuthentication extends ParanoidModel<
  InferAttributes<OAuthAuthentication>,
  Partial<InferCreationAttributes<OAuthAuthentication>>
> {
  public static accessTokenPrefix = "ol_at_";
  public static refreshTokenPrefix = "ol_rt_";

  @Unique
  @Column
  @SkipChangeset
  accessTokenHash: string;

  /** The cached plain text access token. Only available during creation. */
  @Column(DataType.VIRTUAL)
  accessToken: string | null;

  @IsDate
  @Column
  accessTokenExpiresAt: Date;

  @Unique
  @Column
  @SkipChangeset
  refreshTokenHash: string;

  /** The cached plain text refresh token. Only available during creation. */
  @Column(DataType.VIRTUAL)
  refreshToken: string | null;

  @IsDate
  @Column
  refreshTokenExpiresAt: Date;

  /** A list of scopes that this authentication has access to */
  @Matches(/[\/\.\w\s]*/, {
    each: true,
  })
  @Column(DataType.ARRAY(DataType.STRING))
  scope: string[];

  @IsDate
  @Column
  @SkipChangeset
  lastActiveAt: Date;

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

  // methods

  updateActiveAt = async () => {
    const fiveMinutesAgo = subMinutes(new Date(), 5);

    // ensure this is updated only every few minutes otherwise
    // we'll be constantly writing to the DB as API requests happen
    if (!this.lastActiveAt || this.lastActiveAt < fiveMinutesAgo) {
      this.lastActiveAt = new Date();
    }

    return this.save({ silent: true });
  };

  // hooks

  @BeforeCreate
  static async setLastActiveAt(model: OAuthAuthentication) {
    model.lastActiveAt = new Date();
  }

  // instance methods

  /** Checks if the authentication has access to the given path */
  canAccess = (path: string) =>
    AuthenticationHelper.canAccess(path, this.scope);

  // static methods

  /**
   * Validates that the input text _could_ be an OAuth token, this does not check
   * that the key actually exists in the database.
   *
   * @param text The text to validate
   * @returns True if likely an OAuth token
   */
  public static match(text: string) {
    return !!text.startsWith(this.accessTokenPrefix);
  }

  /**
   * Finds an OAuthAuthentication by the given access token, including the
   * associated user.
   *
   * @param input The access token to search for
   * @param options The options to pass to the find method
   * @returns The OAuthAuthentication if found
   */
  static findByAccessToken(
    input: string,
    options?:
      | FindOptions<OAuthAuthentication>
      | NonNullFindOptions<OAuthAuthentication>
  ): Promise<OAuthAuthentication | null> {
    return this.findOne({
      where: {
        accessTokenHash: hash(input),
      },
      include: [
        {
          association: "user",
          required: true,
        },
      ],
      ...options,
    });
  }

  /**
   * Finds an OAuthAuthentication by the given refresh token, including the
   * associated user.
   *
   * @param input The refresh token to search for
   * @param options The options to pass to the find method
   * @returns The OAuthAuthentication if found
   */
  public static findByRefreshToken(
    input: string,
    options?:
      | FindOptions<OAuthAuthentication>
      | NonNullFindOptions<OAuthAuthentication>
  ) {
    return this.findOne({
      where: {
        refreshTokenHash: hash(input),
      },
      include: [
        {
          association: "user",
          required: true,
        },
      ],
      ...options,
    });
  }
}

export default OAuthAuthentication;
