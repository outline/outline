import crypto from "crypto";
import { addDays, addHours, subMinutes } from "date-fns";
import rs from "randomstring";
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
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import { SkipChangeset } from "./decorators/Changeset";
import Fix from "./decorators/Fix";

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

  @Column
  scope: string;

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
  static async generateTokens(model: OAuthAuthentication) {
    const accessToken = `${this.accessTokenPrefix}${rs.generate(32)}`;
    model.accessToken = accessToken;
    model.accessTokenHash = this.hash(accessToken);
    model.accessTokenExpiresAt = addHours(new Date(), 1);

    const refreshToken = `${this.refreshTokenPrefix}${rs.generate(32)}`;
    model.refreshToken = refreshToken;
    model.refreshTokenHash = this.hash(refreshToken);
    model.refreshTokenExpiresAt = addDays(new Date(), 30);
  }

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
   * Finds an OAuthAuthentication by the given input string.
   *
   * @param input The input string to search for
   * @returns The OAuthAuthentication if found
   */
  public static findByAccessToken(input: string) {
    return this.findOne({
      where: {
        accessTokenHash: this.hash(input),
      },
    });
  }
}

export default OAuthAuthentication;
