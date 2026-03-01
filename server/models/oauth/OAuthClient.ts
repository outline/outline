import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsUrl,
} from "class-validator";
import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  Length,
  BeforeCreate,
  AllowNull,
  IsDate,
  IsIn,
  Unique,
} from "sequelize-typescript";
import { randomString } from "@shared/random";
import { OAuthClientValidation } from "@shared/validations";
import Team from "@server/models/Team";
import User from "@server/models/User";
import ParanoidModel from "@server/models/base/ParanoidModel";
import { SkipChangeset } from "@server/models/decorators/Changeset";
import Encrypted from "@server/models/decorators/Encrypted";
import Fix from "@server/models/decorators/Fix";
import { hash } from "@server/utils/crypto";
import IsUrlOrRelativePath from "@server/models/validators/IsUrlOrRelativePath";
import NotContainsUrl from "@server/models/validators/NotContainsUrl";
import type { FindOptions } from "sequelize";

@Table({
  tableName: "oauth_clients",
  modelName: "oauth_client",
})
@Fix
class OAuthClient extends ParanoidModel<
  InferAttributes<OAuthClient>,
  Partial<InferCreationAttributes<OAuthClient>>
> {
  static eventNamespace = "oauthClients";

  public static clientSecretPrefix = "ol_sk_";

  public static registrationAccessTokenPrefix = "ol_rat_";

  @NotContainsUrl
  @Length({ max: OAuthClientValidation.maxNameLength })
  @Column
  name: string;

  @AllowNull
  @NotContainsUrl
  @Length({ max: OAuthClientValidation.maxDescriptionLength })
  @Column
  description: string | null;

  @AllowNull
  @NotContainsUrl
  @Length({ max: OAuthClientValidation.maxDeveloperNameLength })
  @Column
  developerName: string | null;

  @AllowNull
  @IsUrlOrRelativePath
  @Length({ max: OAuthClientValidation.maxDeveloperUrlLength })
  @Column
  developerUrl: string | null;

  @AllowNull
  @IsUrlOrRelativePath
  @Length({ max: OAuthClientValidation.maxAvatarUrlLength })
  @Column
  avatarUrl: string | null;

  @Column
  clientId: string;

  @IsIn([Array.from(OAuthClientValidation.clientTypes)])
  @Column(DataType.STRING)
  clientType: (typeof OAuthClientValidation.clientTypes)[number];

  @Column(DataType.BLOB)
  @Encrypted
  clientSecret: string;

  @Column
  published: boolean;

  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUrl(
    {
      require_tld: false,
      allow_underscores: true,
    },
    {
      each: true,
    }
  )
  @Column(DataType.ARRAY(DataType.STRING))
  redirectUris: string[];

  /** The last time this client was used to make an API request. */
  @AllowNull
  @IsDate
  @Column
  @SkipChangeset
  lastActiveAt: Date | null;

  /** SHA-256 hash of the registration access token (RFC 7592). */
  @AllowNull
  @Unique
  @Column
  registrationAccessTokenHash: string | null;

  /** The cached registration access token. Only available during creation. */
  @Column(DataType.VIRTUAL)
  registrationAccessToken: string | null;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User | null;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string | null;

  // instance methods

  /**
   * Rotate the client secret value. Does not persist to database.
   */
  public rotateClientSecret() {
    this.clientSecret = OAuthClient.generateNewClientSecret();
  }

  /**
   * Rotate the registration access token. Sets both the plain token
   * (virtual) and its hash. Does not persist to database.
   */
  public rotateRegistrationAccessToken() {
    const token = OAuthClient.generateNewRegistrationAccessToken();
    this.registrationAccessToken = token;
    this.registrationAccessTokenHash = hash(token);
  }

  /**
   * Determine if this client was created through dynamic client registration (DCR).
   * DCR clients are identified by having a null `createdById`, meaning they were not created by any user.
   *
   * @returns true if this client is a DCR client, false otherwise.
   */
  public get isDCR() {
    return !this.createdById;
  }

  // hooks

  @BeforeCreate
  public static async generateCredentials(model: OAuthClient) {
    model.clientId = OAuthClient.generateNewClientId();
    model.clientSecret = OAuthClient.generateNewClientSecret();

    if (model.isDCR) {
      const token = OAuthClient.generateNewRegistrationAccessToken();
      model.registrationAccessToken = token;
      model.registrationAccessTokenHash = hash(token);
    }
  }

  // static methods

  /**
   * Find an OAuthClient by it's public `clientId`
   *
   * @param clientId The public clientId of the OAuthClient
   * @returns The OAuthClient or null if not found
   */
  public static async findByClientId(clientId: string) {
    return this.findOne({
      where: {
        clientId,
      },
    });
  }

  /**
   * Find an OAuthClient by its registration access token.
   *
   * @param token The plain registration access token.
   * @param options Optional Sequelize find options to include transaction or other query modifiers.
   * @returns the OAuthClient or null if not found.
   */
  public static async findByRegistrationAccessToken(
    token: string,
    options?: FindOptions
  ) {
    return this.findOne({
      where: {
        registrationAccessTokenHash: hash(token),
      },
      ...options,
    });
  }

  private static generateNewRegistrationAccessToken(): string {
    return `${OAuthClient.registrationAccessTokenPrefix}${randomString(38)}`;
  }

  private static generateNewClientId(): string {
    return randomString({
      length: 20,
      charset: "alphanumeric",
      capitalization: "lowercase",
    });
  }

  private static generateNewClientSecret(): string {
    return `${OAuthClient.clientSecretPrefix}${randomString(32)}`;
  }
}

export default OAuthClient;
