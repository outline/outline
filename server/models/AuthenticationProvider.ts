import { Op } from "sequelize";
import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Table,
  Model,
  IsUUID,
  PrimaryKey,
} from "sequelize-typescript";
import env from "@server/env";
import AzureClient from "@server/utils/azure";
import GoogleClient from "@server/utils/google";
import OIDCClient from "@server/utils/oidc";
import { ValidationError } from "../errors";
import Team from "./Team";
import UserAuthentication from "./UserAuthentication";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({
  tableName: "authentication_providers",
  modelName: "authentication_provider",
  updatedAt: false,
})
@Fix
class AuthenticationProvider extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Length({
    max: 255,
    msg: "name must be 255 characters or less",
  })
  @Column
  name: string;

  @Default(true)
  @Column
  enabled: boolean;

  @Length({
    max: 255,
    msg: "providerId must be 255 characters or less",
  })
  @Column
  providerId: string;

  @CreatedAt
  createdAt: Date;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @HasMany(() => UserAuthentication, "providerId")
  userAuthentications: UserAuthentication[];

  // instance methods

  /**
   * Create an OAuthClient for this provider, if possible.
   *
   * @returns A configured OAuthClient instance
   */
  get oauthClient() {
    switch (this.name) {
      case "google":
        return new GoogleClient(
          env.GOOGLE_CLIENT_ID || "",
          env.GOOGLE_CLIENT_SECRET || ""
        );
      case "azure":
        return new AzureClient(
          env.AZURE_CLIENT_ID || "",
          env.AZURE_CLIENT_SECRET || ""
        );
      case "oidc":
        return new OIDCClient(
          env.OIDC_CLIENT_ID || "",
          env.OIDC_CLIENT_SECRET || ""
        );
      default:
        return undefined;
    }
  }

  disable = async () => {
    const res = await (this
      .constructor as typeof AuthenticationProvider).findAndCountAll({
      where: {
        teamId: this.teamId,
        enabled: true,
        id: {
          [Op.ne]: this.id,
        },
      },
      limit: 1,
    });

    if (res.count >= 1) {
      return this.update({
        enabled: false,
      });
    } else {
      throw ValidationError("At least one authentication provider is required");
    }
  };

  enable = () => {
    return this.update({
      enabled: true,
    });
  };
}

export default AuthenticationProvider;
