import crypto from "crypto";
import User from "@server/models/User";
import ParanoidModel from "@server/models/base/ParanoidModel";
import { SkipChangeset } from "@server/models/decorators/Changeset";
import Fix from "@server/models/decorators/Fix";
import { Matches } from "class-validator";
import { subMinutes } from "date-fns";
import { InferAttributes, InferCreationAttributes } from "sequelize";
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
  public static accessTokenPrefix = "ol_atx_";
  public static refreshTokenPrefix = "ol_rtx_";

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

  // static methods

  /**
   * Generates a hashed token for the given input.
   *
   * @param key The input string to hash
   * @returns The hashed input
   */
  public static hash(key: string) {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  /**
   * Finds an OAuthAuthentication by the given access token.
   *
   * @param input The access token to search for
   * @returns The OAuthAuthentication if found
   */
  public static findByAccessToken(input: string) {
    return this.findOne({
      where: {
        accessTokenHash: this.hash(input),
      },
      include: [
        {
          association: "user",
          required: true,
        },
      ],
      rejectOnEmpty: true,
    });
  }

  /**
   * Finds an OAuthAuthentication by the given refresh token.
   *
   * @param input The refresh token to search for
   * @returns The OAuthAuthentication if found
   */
  public static findByRefreshToken(input: string) {
    return this.findOne({
      where: {
        refreshTokenHash: this.hash(input),
      },
      include: [
        {
          association: "user",
          required: true,
        },
      ],
      rejectOnEmpty: true,
    });
  }
}

export default OAuthAuthentication;
