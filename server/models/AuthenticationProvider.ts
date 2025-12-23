import type {
  InferAttributes,
  InferCreationAttributes,
  Transaction,
} from "sequelize";
import { Op } from "sequelize";
import {
  BeforeDestroy,
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
import type { APIContext } from "@server/types";
import type { DestroyOptions } from "sequelize";

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

  /**
   * Check if this provider can be disabled or destroyed.
   * Throws an error if this is the last enabled authentication provider.
   *
   * @param transaction - Database transaction to use for the check.
   * @throws ValidationError if disabling is not allowed.
   */
  private async checkCanBeDisabled(
    transaction?: Transaction | null
  ): Promise<void> {
    // Check if email sign-in is enabled for the team first
    const team = await Team.findByPk(this.teamId, {
      transaction,
      lock: transaction?.LOCK.SHARE,
    });
    if (team?.emailSigninEnabled) {
      return;
    }

    const otherEnabledProviders = await (
      this.constructor as typeof AuthenticationProvider
    ).findAll({
      transaction,
      lock: transaction?.LOCK.SHARE,
      where: {
        teamId: this.teamId,
        enabled: true,
        id: {
          [Op.ne]: this.id,
        },
      },
      limit: 1,
    });

    if (otherEnabledProviders.length === 0) {
      throw ValidationError("At least one authentication provider is required");
    }
  }

  @BeforeDestroy
  static async checkBeforeDestroy(
    instance: AuthenticationProvider,
    options: DestroyOptions
  ) {
    if (instance.enabled) {
      await instance.checkCanBeDisabled(options.transaction);
    }
  }

  /**
   * Disable this authentication provider after ensuring it's allowed.
   *
   * @param ctx - API context containing the transaction.
   * @returns The updated AuthenticationProvider instance.
   * @throws ValidationError if disabling is not allowed.
   */
  disable: (ctx: APIContext) => Promise<AuthenticationProvider> = async (
    ctx
  ) => {
    const { transaction } = ctx.state;
    await this.checkCanBeDisabled(transaction);

    return this.updateWithCtx(ctx, {
      enabled: false,
    });
  };

  /**
   * Enable this authentication provider.
   *
   * @param ctx - API context containing the transaction.
   * @returns The updated AuthenticationProvider instance.
   */
  enable: (ctx: APIContext) => Promise<AuthenticationProvider> = async (ctx) =>
    this.updateWithCtx(ctx, {
      enabled: true,
    });
}

export default AuthenticationProvider;
