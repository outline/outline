import type { InferAttributes, InferCreationAttributes } from "sequelize";
import { type InstanceDestroyOptions } from "sequelize";
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
import type { IssueSource } from "@shared/schema";
import { IntegrationType, IntegrationService } from "@shared/types";
import type { IntegrationSettings } from "@shared/types";
import Collection from "@server/models/Collection";
import IntegrationAuthentication from "@server/models/IntegrationAuthentication";
import Team from "@server/models/Team";
import User from "@server/models/User";
import ParanoidModel from "@server/models/base/ParanoidModel";

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

  @Column(DataType.JSONB)
  issueSources: IssueSource[] | null;

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

  // methods

  /**
   * The subset of settings that are safe to expose to clients. Each integration
   * type opts-in to the specific fields its client consumes, so sensitive values
   * such as webhook URLs are never serialized by default.
   *
   * @returns the client-safe settings, or undefined when none are exposed.
   */
  public presentSettings() {
    switch (this.type) {
      case IntegrationType.Embed: {
        const settings = this
          .settings as IntegrationSettings<IntegrationType.Embed>;
        return {
          url: settings?.url,
          github: settings?.github,
          gitlab: settings?.gitlab,
          linear: settings?.linear,
          diagrams: settings?.diagrams,
        };
      }
      case IntegrationType.Analytics: {
        const settings = this
          .settings as IntegrationSettings<IntegrationType.Analytics>;
        return {
          measurementId: settings?.measurementId,
          instanceUrl: settings?.instanceUrl,
          scriptName: settings?.scriptName,
        };
      }
      case IntegrationType.Post: {
        const settings = this
          .settings as IntegrationSettings<IntegrationType.Post>;
        return { channel: settings?.channel };
      }
      case IntegrationType.LinkedAccount: {
        const settings = this
          .settings as IntegrationSettings<IntegrationType.LinkedAccount>;
        return { figma: settings?.figma };
      }
      default:
        return undefined;
    }
  }

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
