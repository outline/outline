import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsUrl,
} from "class-validator";
import rs from "randomstring";
import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  Length,
  BeforeCreate,
  AllowNull,
} from "sequelize-typescript";
import { OAuthClientValidation } from "@shared/validations";
import Team from "@server/models/Team";
import User from "@server/models/User";
import ParanoidModel from "@server/models/base/ParanoidModel";
import Encrypted from "@server/models/decorators/Encrypted";
import Fix from "@server/models/decorators/Fix";
import IsUrlOrRelativePath from "@server/models/validators/IsUrlOrRelativePath";
import NotContainsUrl from "@server/models/validators/NotContainsUrl";

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

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  // instance methods

  /**
   * Rotate the client secret value. Does not persist to database.
   */
  public rotateClientSecret() {
    this.clientSecret = OAuthClient.generateNewClientSecret();
  }

  // hooks

  @BeforeCreate
  public static async generateCredentials(model: OAuthClient) {
    model.clientId = OAuthClient.generateNewClientId();
    model.clientSecret = OAuthClient.generateNewClientSecret();
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

  private static generateNewClientId(): string {
    return rs.generate({
      length: 20,
      charset: "alphanumeric",
      capitalization: "lowercase",
    });
  }

  private static generateNewClientSecret(): string {
    return `${OAuthClient.clientSecretPrefix}${rs.generate(32)}`;
  }
}

export default OAuthClient;
