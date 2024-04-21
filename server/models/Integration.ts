import {
  InferAttributes,
  InferCreationAttributes,
  type InstanceDestroyOptions,
} from "sequelize";
import {
  ForeignKey,
  BelongsTo,
  Column,
  Table,
  DataType,
  Scopes,
  IsIn,
  AfterDestroy,
} from "sequelize-typescript";
import { IntegrationType, IntegrationService } from "@shared/types";
import type { IntegrationSettings } from "@shared/types";
import Collection from "@server/models/Collection";
import IntegrationAuthentication from "@server/models/IntegrationAuthentication";
import Team from "@server/models/Team";
import User from "@server/models/User";
import ParanoidModel from "@server/models/base/ParanoidModel";
import Fix from "@server/models/decorators/Fix";

@Scopes(() => ({
  withAuthentication: {
    include: [
      {
        model: IntegrationAuthentication,
        as: "authentication",
        required: true,
      },
    ],
  },
}))
@Table({ tableName: "integrations", modelName: "integration" })
@Fix
class Integration<T = unknown> extends ParanoidModel<
  InferAttributes<Integration<T>>,
  Partial<InferCreationAttributes<Integration<T>>>
> {
  @IsIn([Object.values(IntegrationType)])
  @Column(DataType.STRING)
  type: IntegrationType;

  @IsIn([Object.values(IntegrationService)])
  @Column(DataType.STRING)
  service: IntegrationService;

  @Column(DataType.JSONB)
  settings: IntegrationSettings<T>;

  @Column(DataType.ARRAY(DataType.STRING))
  events: string[];

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection?: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId?: string | null;

  @BelongsTo(() => IntegrationAuthentication, "authenticationId")
  authentication: IntegrationAuthentication;

  @ForeignKey(() => IntegrationAuthentication)
  @Column(DataType.UUID)
  authenticationId: string;

  // hooks

  @AfterDestroy
  static async destoryIntegrationAuthentications(
    model: Integration,
    options?: InstanceDestroyOptions
  ) {
    if (options?.force && model.authenticationId) {
      await IntegrationAuthentication.destroy({
        where: {
          id: model.authenticationId,
        },
        ...options,
      });
    }
  }
}

export default Integration;
