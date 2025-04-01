import { ArrayNotEmpty, ArrayUnique, IsUrl } from "class-validator";
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
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Encrypted from "./decorators/Encrypted";
import Fix from "./decorators/Fix";
import IsUrlOrRelativePath from "./validators/IsUrlOrRelativePath";
import NotContainsUrl from "./validators/NotContainsUrl";

@Table({
  tableName: "oauth_clients",
  modelName: "oauth_client",
})
@Fix
class OAuthClient extends ParanoidModel<
  InferAttributes<OAuthClient>,
  Partial<InferCreationAttributes<OAuthClient>>
> {
  public static secretPrefix = "ol_secret_";

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

  @Column(DataType.ARRAY(DataType.STRING))
  @ArrayNotEmpty()
  @ArrayUnique()
  @Length({ max: OAuthClientValidation.maxRedirectUriLength })
  @IsUrl(
    {
      require_tld: false,
      allow_underscores: true,
    },
    {
      each: true,
    }
  )
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

  // hooks

  @BeforeCreate
  public static async generateCredentials(model: OAuthClient) {
    model.clientId = rs.generate({
      length: 32,
      charset: "alphanumeric",
    });
    model.clientSecret = `${OAuthClient.secretPrefix}${rs.generate(32)}`;
  }
}

export default OAuthClient;
