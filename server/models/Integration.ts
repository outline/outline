import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  ForeignKey,
  BelongsTo,
  Column,
  Table,
  DataType,
  Scopes,
  IsIn,
} from "sequelize-typescript";
import { IntegrationType, IntegrationService } from "@shared/types";
import type {
  IntegrationSettings,
  UserCreatableIntegrationService,
} from "@shared/types";
import Collection from "./Collection";
import IntegrationAuthentication from "./IntegrationAuthentication";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

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
class Integration<T = unknown> extends IdModel<
  InferAttributes<Integration<T>>,
  Partial<InferCreationAttributes<Integration<T>>>
> {
  @IsIn([Object.values(IntegrationType)])
  @Column(DataType.STRING)
  type: IntegrationType;

  @IsIn([Object.values(IntegrationService)])
  @Column(DataType.STRING)
  service: IntegrationService | UserCreatableIntegrationService;

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
}

export default Integration;
