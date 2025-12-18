import { IssueSource } from "@shared/schema";
import { IntegrationService, IntegrationType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, IntegrationAuthentication } from "@server/models";
import { BaseIssueProvider } from "@server/utils/BaseIssueProvider";
import { GitLab } from "./gitlab";
import { sequelize } from "@server/storage/database";
import { Op } from "sequelize";
import { Sequelize } from "sequelize";

export class GitLabIssueProvider extends BaseIssueProvider {
  constructor() {
    super(IntegrationService.GitLab);
  }

  async fetchSources(
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]> {
    await integration.reload({
      include: [
        {
          model: IntegrationAuthentication,
          as: "authentication",
          required: true,
        },
      ],
    });

    if (!integration.authentication) {
      Logger.warn("GitLab integration without authentication");
      return [];
    }

    const sources: IssueSource[] = [];

    try {
      const projects = await GitLab.getProjects(
        integration.authentication.token
      );

      sources.push(
        ...projects.map<IssueSource>((project) => ({
          id: String(project.id),
          name: project.name,
          owner: {
            id: String(project.namespace.id),
            name: project.namespace.full_path,
          },
          service: IntegrationService.GitLab,
        }))
      );
    } catch (err) {
      Logger.warn("Failed to fetch projects from GitLab", err);
    }

    return sources;
  }

  async handleWebhook({
    payload,
    headers,
  }: {
    payload: Record<string, unknown>;
    headers: Record<string, unknown>;
  }) {
    const hookId = headers["X-Gitlab-Webhook-UUID"] as string;
    const eventName = payload.event_name as string;

    if (!eventName) {
      Logger.warn(
        `Received GitLab webhook without event name; hookId: ${hookId}, eventName: ${eventName}`
      );
      return;
    }

    switch (eventName) {
      case "project_update":
      case "project_transfer":
      case "project_rename":
        await this.updateProject(payload);
        break;
      case "project_create":
        await this.createProject(payload);
        break;
      case "project_destroy":
        await this.destroyProject(payload);
        break;
      case "group_rename":
        await this.updateNamespace(payload);
        break;
      case "user_destroy":
      case "group_destroy":
        await this.destroyNamespace(payload);
        break;
      case "user_add_to_group":
        await this.addNamespace(payload);
        break;
      default:
        break;
    }
  }

  private async addNamespace(payload: Record<string, any>) {
    await sequelize.transaction(async (transaction) => {
      const existingIntegrations = (await Integration.findAll({
        where: {
          service: IntegrationService.GitLab,
          "settings.gitlab.installation.account.id": payload.user_id,
        },
        lock: transaction.LOCK.UPDATE,
      })) as Integration<IntegrationType.Embed>[];

      for (const integration of existingIntegrations) {
        const userhasNamepsace = integration.issueSources?.some((source) =>
          source.owner.name.endsWith("/" + payload.group_path)
        );

        if (userhasNamepsace) {
          continue;
        }

        const sources = integration.issueSources ?? [];
        // adding a placeholder project
        // so we can use it to find this source when a project is added
        sources.push({
          id: String(payload.group_id),
          name: payload.group_name,
          service: IntegrationService.GitLab,
          owner: {
            id: String(payload.group_id),
            name: payload.group_path,
          },
        });

        integration.issueSources = sources;
        integration.changed("issueSources", true);
        await integration.save({ transaction });
      }
    });
  }

  private async updateNamespace(payload: Record<string, any>) {
    const where = {
      service: IntegrationService.GitLab,
      ...(payload.user_id && {
        "settings.gitlab.installation.account.id": payload.user_id,
      }),
      ...(payload.group_id &&
        !payload.user_id && {
          [Op.and]: Sequelize.literal(
            `"issueSources"::jsonb @> '[{"owner": {"id": "${payload.group_id}"}}]'`
          ),
        }),
    };

    await sequelize.transaction(async (transaction) => {
      const integrations = (await Integration.findAll({
        where,
        lock: transaction.LOCK.UPDATE,
        transaction,
      })) as Integration<IntegrationType.Embed>[];

      if (integrations.length === 0) {
        Logger.warn(`GitLab group_update event without integration;`);
        return;
      }

      for (const integration of integrations) {
        const sources = integration.issueSources ?? [];
        const updatedSources = sources.map((source) => {
          if (source.owner.id === String(payload.group_id)) {
            return {
              ...source,
              name: payload.user_name ?? source.name,
              owner: {
                ...source.owner,
                name: payload.full_path ?? source.owner.name,
              },
            };
          }
          return source;
        });

        integration.issueSources = updatedSources;
        integration.changed("issueSources", true);
        await integration.save({ transaction });
      }
    });
  }

  private async destroyNamespace(payload: Record<string, any>) {
    const where = {
      service: IntegrationService.GitLab,
      ...(payload.user_id && {
        "settings.gitlab.installation.account.id": payload.user_id,
      }),
      ...(payload.group_id &&
        !payload.user_id && {
          [Op.and]: Sequelize.literal(
            `"issueSources"::jsonb @> '[{"owner": {"id": "${payload.group_id}"}}]'`
          ),
        }),
    };

    await sequelize.transaction(async (transaction) => {
      const integrations = (await Integration.findAll({
        where,
        lock: transaction.LOCK.UPDATE,
        transaction,
      })) as Integration<IntegrationType.Embed>[];

      if (!integrations.length) {
        Logger.warn(`GitLab namespace_destroy event without integration;`);
        return;
      }

      for (const integration of integrations) {
        if (payload.group_id) {
          const sources =
            integration.issueSources?.filter(
              (source) => payload.group_id !== source.owner.id
            ) ?? [];

          integration.issueSources = sources;
          integration.changed("issueSources", true);
          await integration.save({ transaction });
        } else if (payload.user_id) {
          await integration.destroy();
        }
      }
    });
  }

  private async destroyProject(payload: Record<string, any>) {
    await sequelize.transaction(async (transaction) => {
      const integrations = await Integration.findAll({
        where: {
          service: IntegrationService.GitLab,
          [Op.and]: Sequelize.literal(
            `"issueSources"::jsonb @> '[{"id": "${payload.project_id}"}]'`
          ),
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!integrations) {
        Logger.warn(`GitLab project_destroy event without integration;`);
        return;
      }

      for (const integration of integrations) {
        const sources =
          integration.issueSources?.filter(
            (source) => String(payload.project_id) !== source.id
          ) ?? [];

        integration.issueSources = sources;
        integration.changed("issueSources", true);
        await integration.save({ transaction });
      }
    });
  }

  private async createProject(payload: Record<string, any>) {
    await sequelize.transaction(async (transaction) => {
      const owner = {
        id: String(payload.project_namespace_id),
        name: payload.path_with_namespace.split("/").slice(0, -1).join("/"),
      };

      const integrations = (await Integration.findAll({
        where: {
          service: IntegrationService.GitLab,
          [Op.and]: Sequelize.literal(
            `"issueSources"::jsonb @> '[{"owner": {"id": "${owner.id}"}}]'`
          ),
        },
        lock: transaction.LOCK.UPDATE,
      })) as Integration<IntegrationType.Embed>[];

      if (!integrations) {
        Logger.warn(`GitLab project_create event without integration;`);
        return;
      }

      for (const integration of integrations) {
        const sources = integration.issueSources ?? [];
        sources.push({
          id: String(payload.project_id),
          name: payload.name,
          service: IntegrationService.GitLab,
          owner,
        });

        integration.issueSources = sources;
        integration.changed("issueSources", true);
        await integration.save({ transaction });
      }
    });
  }

  private async updateProject(payload: Record<string, any>) {
    await sequelize.transaction(async (transaction) => {
      const integrations = await Integration.findAll({
        where: {
          service: IntegrationService.GitLab,
          [Op.and]: Sequelize.literal(
            `"issueSources"::jsonb @> '[{"id": "${payload.project_id}"}]'`
          ),
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!integrations) {
        Logger.warn(`GitLab project_update event without integration;`);
        return;
      }

      for (const integration of integrations) {
        const source = integration.issueSources?.find(
          (s) => s.id === String(payload.project_id)
        );

        if (source) {
          source.name = payload.name;
          source.owner.name = payload.path_with_namespace
            .split("/")
            .slice(0, -1)
            .join("/");
          source.owner.id = String(payload.project_namespace_id);
          integration.changed("issueSources", true);
          await integration.save({ transaction });
        }
      }
    });
  }
}
