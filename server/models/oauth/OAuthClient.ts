import type {
  InferAttributes,
  InferCreationAttributes,
  InstanceDestroyOptions,
  InstanceUpdateOptions,
  Transaction,
} from "sequelize";
import {
  AfterDestroy,
  AfterUpdate,
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  BeforeCreate,
  AllowNull,
  IsDate,
  IsIn,
  Unique,
} from "sequelize-typescript";
import { randomString } from "@shared/random";
import { errToString } from "@shared/utils/error";
import { OAuthClientValidation } from "@shared/validations";
import Logger from "@server/logging/Logger";
import Team from "@server/models/Team";
import User from "@server/models/User";
import ParanoidModel from "@server/models/base/ParanoidModel";
import { SkipChangeset } from "@server/models/decorators/Changeset";
import Encrypted from "@server/models/decorators/Encrypted";
import { hash } from "@server/utils/crypto";
import IsUrlOrRelativePath from "@server/models/validators/IsUrlOrRelativePath";
import IsUrlList from "@server/models/validators/IsUrlList";
import Length from "@server/models/validators/Length";
import NotContainsUrl from "@server/models/validators/NotContainsUrl";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
import { afterCommit } from "@server/storage/transaction";
import type { FindOptions } from "sequelize";

@Table({
  tableName: "oauth_clients",
  modelName: "oauth_client",
})
class OAuthClient extends ParanoidModel<
  InferAttributes<OAuthClient>,
  Partial<InferCreationAttributes<OAuthClient>>
> {
  static eventNamespace = "oauthClients";

  public static clientSecretPrefix = "ol_sk_";

  public static registrationAccessTokenPrefix = "ol_rat_";

  @NotContainsUrl
  @Length({
    max: OAuthClientValidation.maxNameLength,
    msg: `name must be ${OAuthClientValidation.maxNameLength} characters or less`,
  })
  @Column(DataType.STRING)
  name: string;

  @AllowNull
  @NotContainsUrl
  @Length({
    max: OAuthClientValidation.maxDescriptionLength,
    msg: `description must be ${OAuthClientValidation.maxDescriptionLength} characters or less`,
  })
  @Column(DataType.STRING)
  description: string | null;

  @AllowNull
  @NotContainsUrl
  @Length({
    max: OAuthClientValidation.maxDeveloperNameLength,
    msg: `developerName must be ${OAuthClientValidation.maxDeveloperNameLength} characters or less`,
  })
  @Column(DataType.STRING)
  developerName: string | null;

  @AllowNull
  @IsUrlOrRelativePath
  @Length({
    max: OAuthClientValidation.maxDeveloperUrlLength,
    msg: `developerUrl must be ${OAuthClientValidation.maxDeveloperUrlLength} characters or less`,
  })
  @Column(DataType.STRING)
  developerUrl: string | null;

  @AllowNull
  @IsUrlOrRelativePath
  @Length({
    max: OAuthClientValidation.maxAvatarUrlLength,
    msg: `avatarUrl must be ${OAuthClientValidation.maxAvatarUrlLength} characters or less`,
  })
  @Column(DataType.STRING)
  avatarUrl: string | null;

  /**
   * The public client identifier. Either a generated value, or the URL of a
   * client ID metadata document (CIMD).
   */
  @Length({
    max: OAuthClientValidation.maxClientIdLength,
    msg: `clientId must be ${OAuthClientValidation.maxClientIdLength} characters or less`,
  })
  @Column(DataType.STRING(OAuthClientValidation.maxClientIdLength))
  clientId: string;

  @IsIn([Array.from(OAuthClientValidation.clientTypes)])
  @Column(DataType.STRING)
  clientType: (typeof OAuthClientValidation.clientTypes)[number];

  /** The client secret. Null for clients identified by a metadata document. */
  @AllowNull
  @Column(DataType.BLOB)
  @Encrypted
  clientSecret: string | null;

  @Column(DataType.BOOLEAN)
  published: boolean;

  @IsUrlList({ min: 1, max: OAuthClientValidation.maxRedirectUris })
  @Column(DataType.ARRAY(DataType.STRING))
  redirectUris: string[];

  /** The last time this client was used to make an API request. */
  @AllowNull
  @IsDate
  @Column(DataType.DATE)
  @SkipChangeset
  lastActiveAt: Date | null;

  /** SHA-256 hash of the registration access token (RFC 7592). */
  @AllowNull
  @Unique
  @Column(DataType.STRING)
  registrationAccessTokenHash: string | null;

  /** The cached registration access token. Only available during creation. */
  @Column(DataType.VIRTUAL)
  registrationAccessToken: string | null;

  /** When the cached client ID metadata document must be fetched again. */
  @AllowNull
  @IsDate
  @Column(DataType.DATE)
  @SkipChangeset
  metadataExpiresAt: Date | null;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team | null;

  /** The owning team. Null for clients identified by a metadata document. */
  @AllowNull
  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string | null;

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
    return !this.createdById && !this.isCIMD;
  }

  /**
   * Determine if this client exists only to serve MCP. This is true for
   * clients from dynamic client registration and from metadata documents.
   *
   * @returns true if this client was not created by a user, false otherwise.
   */
  public get isMCPClient() {
    return !this.createdById;
  }

  /**
   * Determine if this client is identified by a client ID metadata document
   * (CIMD). These clients use the https URL of the document as their
   * `clientId`, and do not belong to a team.
   *
   * @returns true if this client is a CIMD client, false otherwise.
   */
  public get isCIMD() {
    return OAuthClient.isMetadataDocumentClientId(this.clientId);
  }

  /**
   * Returns the storage key of a logo that was copied for this client.
   *
   * @param avatarUrl An avatar URL of this client.
   * @returns The storage key, or undefined if the URL is not a copied logo.
   */
  public logoKeyFromUrl(avatarUrl: string | null | undefined) {
    const prefix = OAuthClient.logoKeyPrefix(this.id);
    const index = avatarUrl?.lastIndexOf(prefix) ?? -1;
    if (!avatarUrl || index === -1) {
      return undefined;
    }

    const key = avatarUrl.slice(index);
    if (!/^[0-9a-f]{64}\.[^/]+$/.test(key.slice(prefix.length))) {
      return undefined;
    }

    // Only a URL that this installation built can name a file to delete.
    return FileStorage.getUrlForKey(key) === avatarUrl ? key : undefined;
  }

  /**
   * Delete a logo that was copied for this client from file storage. When a
   * transaction is given, this runs after it commits.
   *
   * @param avatarUrl The avatar URL that this client no longer uses.
   * @param transaction The transaction of the change, if any.
   */
  private async deleteLogoFile(
    avatarUrl: string | null | undefined,
    transaction?: Transaction | null
  ) {
    const key = this.logoKeyFromUrl(avatarUrl);
    if (!key) {
      return;
    }

    const deleteFile = async () => {
      try {
        await FileStorage.deleteFile(key);
      } catch (err) {
        // A failed delete must not fail the change to the client.
        Logger.warn("Failed to delete OAuth client logo from storage", {
          key,
          error: errToString(err),
        });
      }
    };

    await afterCommit(transaction, deleteFile);
  }

  // hooks

  @BeforeCreate
  public static async generateCredentials(model: OAuthClient) {
    // Metadata document clients are public and identified by their URL.
    if (model.isCIMD) {
      return;
    }

    model.clientId = OAuthClient.generateNewClientId();
    model.clientSecret = OAuthClient.generateNewClientSecret();

    if (model.isDCR) {
      const token = OAuthClient.generateNewRegistrationAccessToken();
      model.registrationAccessToken = token;
      model.registrationAccessTokenHash = hash(token);
    }
  }

  @AfterUpdate
  public static async deleteReplacedLogo(
    model: OAuthClient,
    options: InstanceUpdateOptions
  ) {
    if (model.changed("avatarUrl")) {
      await model.deleteLogoFile(
        model.previous("avatarUrl"),
        options.transaction
      );
    }
  }

  @AfterDestroy
  public static async deleteLogo(
    model: OAuthClient,
    options: InstanceDestroyOptions
  ) {
    await model.deleteLogoFile(model.avatarUrl, options.transaction);
  }

  // static methods

  /**
   * Returns the storage key for a logo copied from a client's logo URL. Each
   * client has its own files, and the hash changes the URL when the logo
   * changes so that caches do not show an old logo.
   *
   * @param clientId The ID of the client.
   * @param hash The SHA-256 hash of the logo, in hex.
   * @param extension The file extension of the logo.
   * @returns The storage key.
   */
  public static logoKey(clientId: string, hash: string, extension: string) {
    return `${OAuthClient.logoKeyPrefix(clientId)}${hash}.${extension}`;
  }

  /**
   * Returns the storage key prefix for the logos of a client.
   *
   * @param clientId The ID of the client.
   * @returns The storage key prefix, with a trailing slash.
   */
  public static logoKeyPrefix(clientId: string) {
    return `${Buckets.public}/oauth-clients/${clientId}/`;
  }

  /**
   * Whether a client identifier is the URL of a client ID metadata document.
   * Generated identifiers never contain a scheme, so the prefix is enough to
   * tell them apart.
   *
   * @param clientId The client identifier to check.
   * @returns true if the identifier is a metadata document URL.
   */
  public static isMetadataDocumentClientId(clientId: string | undefined) {
    return !!clientId?.startsWith(
      OAuthClientValidation.metadataDocumentClientIdPrefix
    );
  }

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
