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
import type { IntegrationSettings } from "@shared/types";
import Collection from "./Collection";
import IntegrationAuthentication from "./IntegrationAuthentication";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

export enum UserCreatableIntegrationService {
  Diagrams = "diagrams",
  Grist = "grist",
  GoogleAnalytics = "google-analytics",
}

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
class Integration<T = unknown> extends IdModel {
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
  collection: Collection;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  @BelongsTo(() => IntegrationAuthentication, "authenticationId")
  authentication: IntegrationAuthentication;

  @ForeignKey(() => IntegrationAuthentication)
  @Column(DataType.UUID)
  authenticationId: string;
}

export default Integration;
