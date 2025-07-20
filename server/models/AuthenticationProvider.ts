import { InferAttributes, InferCreationAttributes, Op } from "sequelize";
import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Table,
  IsUUID,
  PrimaryKey,
  Scopes,
} from "sequelize-typescript";
import Model from "@server/models/base/Model";
import { ValidationError } from "../errors";
import Team from "./Team";
import UserAuthentication from "./UserAuthentication";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

// TODO: Avoid this hardcoding of plugins
import AzureClient from "plugins/azure/server/azure";
import GoogleClient from "plugins/google/server/google";
import OIDCClient from "plugins/oidc/server/oidc";
import { APIContext } from "@server/types";

@Scopes(() => ({
  withUserAuthentication: (userId: string) => ({
    include: [
      {
        model: UserAuthentication,
        as: "userAuthentications",
        required: true,
        where: {
          userId,
        },
      },
    ],
  }),
}))
@Table({
  tableName: "authentication_providers",
  modelName: "authentication_provider",
  updatedAt: false,
})
@Fix
class AuthenticationProvider extends Model<
  InferAttributes<AuthenticationProvider>,
  Partial<InferCreationAttributes<AuthenticationProvider>>
> {
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

  @HasMany(() => UserAuthentication, "authenticationProviderId")
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
        return new GoogleClient();
      case "azure":
        return new AzureClient();
      case "oidc":
        return new OIDCClient();
      default:
        return undefined;
    }
  }

  disable: (ctx: APIContext) => Promise<AuthenticationProvider> = async (
    ctx
  ) => {
    const res = await (
      this.constructor as typeof AuthenticationProvider
    ).findAndCountAll({
      transaction: ctx.transaction,
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
      return this.updateWithCtx(ctx, {
        enabled: false,
      });
    } else {
      throw ValidationError("At least one authentication provider is required");
    }
  };

  enable: (ctx: APIContext) => Promise<AuthenticationProvider> = async (ctx) =>
    this.updateWithCtx(ctx, {
      enabled: true,
    });
}

export default AuthenticationProvider;
