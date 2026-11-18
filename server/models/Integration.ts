import type {
  InferAttributes,
  InferCreationAttributes,
  Transaction,
} from "sequelize";
import { type InstanceDestroyOptions } from "sequelize";
import {
  ForeignKey,
  BelongsTo,
  Column,
  Table,
  DataType,
  Scopes,
  IsIn,
  AfterCreate,
  AfterUpdate,
  AfterDestroy,
  AfterRestore,
} from "sequelize-typescript";
import type { IssueSource } from "@shared/schema";
import { IntegrationType, IntegrationService } from "@shared/types";
import type { IntegrationSettings } from "@shared/types";
import { Hour } from "@shared/utils/time";
import Collection from "@server/models/Collection";
import IntegrationAuthentication from "@server/models/IntegrationAuthentication";
import Team from "@server/models/Team";
import User from "@server/models/User";
import ParanoidModel from "@server/models/base/ParanoidModel";
import { afterCommit } from "@server/storage/transaction";
import { CacheHelper } from "@server/utils/CacheHelper";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";

/** A lightweight, cacheable projection of an integration. */
export interface IntegrationSummary {
  /** The integration ID. */
  id: string;
  /** The integration type, if any. */
  type: IntegrationType | null;
  /** The collection the integration is scoped to, if any. */
  collectionId: string | null;
  /** The event names the integration is subscribed to, if any. */
  events: string[] | null;
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
class Integration<T = unknown> extends ParanoidModel<
  InferAttributes<Integration<T>>,
  Partial<InferCreationAttributes<Integration<T>>>
> {
  /**
   * Load the analytics integrations enabled for a team.
   *
   * @param teamId The team to load integrations for, if any.
   * @returns the team's analytics integrations.
   */
  public static async findAnalyticsIntegrationsForTeam(
    teamId: string | undefined
  ): Promise<Integration<IntegrationType.Analytics>[]> {
    if (!teamId) {
      return [];
    }

    return this.findAll({
      where: {
        teamId,
        type: IntegrationType.Analytics,
      },
    });
  }

  /**
   * Returns the active integrations for a team and service, caching a
   * lightweight projection in Redis so that event processors can cheaply check
   * whether a team uses a service before doing any work. The cache is
   * invalidated by model lifecycle hooks whenever an integration changes.
   * Settings and authentication are intentionally not cached; load the full
   * model by ID when they are needed.
   *
   * @param teamId The team to load integrations for.
   * @param service The service to load integrations for.
   * @returns the team's integrations for the service.
   */
  public static async findEnabledByTeamIdAndService(
    teamId: string,
    service: IntegrationService
  ): Promise<IntegrationSummary[]> {
    return (
      (await CacheHelper.getDataOrSet<IntegrationSummary[]>(
        RedisPrefixHelper.getIntegrationsKey(teamId, service),
        async () => {
          const integrations = await this.unscoped().findAll({
            attributes: ["id", "type", "collectionId", "events"],
            where: { teamId, service },
            raw: true,
          });
          return integrations.map((integration) => ({
            id: integration.id,
            type: integration.type ?? null,
            collectionId: integration.collectionId ?? null,
            events: integration.events ?? null,
          }));
        },
        Hour.seconds
      )) ?? []
    );
  }

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
   * @param viewer the user the settings are presented to, if any.
   * @returns the client-safe settings, or undefined when none are exposed.
   */
  public presentSettings(viewer?: User) {
    switch (this.type) {
      case IntegrationType.Embed: {
        const settings = this
          .settings as IntegrationSettings<IntegrationType.Embed>;
        return { url: settings?.url, ...this.presentPluginSettings(viewer) };
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
        // Linked accounts hold personal details, only the owner may see them.
        if (!viewer || viewer.id !== this.userId) {
          return undefined;
        }
        return this.presentPluginSettings();
      }
      default:
        return undefined;
    }
  }

  /**
   * Picks the settings keys that plugins registered for this service.
   *
   * @param viewer the user the settings are presented to, if any.
   * @returns the registered settings, keyed by name.
   */
  private presentPluginSettings(viewer?: User) {
    const settings = this.settings as Record<string, unknown> | null;
    const keys = PluginManager.getHooks(Hook.IntegrationSettings)
      .filter(
        (hook) =>
          hook.value.service === this.service &&
          (!viewer?.isGuest || hook.value.visibleToGuests)
      )
      .flatMap((hook) => hook.value.keys);
    return Object.fromEntries(keys.map((key) => [key, settings?.[key]]));
  }

  // hooks

  @AfterCreate
  @AfterUpdate
  @AfterDestroy
  @AfterRestore
  static async invalidateCache(
    model: Integration,
    options: { transaction?: Transaction | null }
  ) {
    await afterCommit(options.transaction, () =>
      CacheHelper.removeData(
        RedisPrefixHelper.getIntegrationsKey(model.teamId, model.service)
      )
    );
  }

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
