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
      default:
        break;
    }
  }

  private async updateNamespace(payload: Record<string, any>) {
    await sequelize.transaction(async (transaction) => {
      const integrations = (await Integration.findAll({
        where: {
          service: IntegrationService.GitLab,
          [Op.and]: Sequelize.literal(
            `"issueSources"::jsonb @> '[{"owner": {"name": "${payload.old_full_path}"}}]'`
          ),
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      })) as Integration<IntegrationType.Embed>[];

      if (!integrations || integrations.length === 0) {
        Logger.warn(`GitLab group_update event without integration;`);
        return;
      }

      for (const integration of integrations) {
        const sources = integration.issueSources ?? [];
        const updatedSources = sources.map((source) => {
          if (source.owner.id === String(payload.group_id)) {
            return {
              ...source,
              owner: {
                ...source.owner,
                name: payload.full_path,
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
    const name = payload.full_path ?? payload.username;

    await sequelize.transaction(async (transaction) => {
      const integrations = (await Integration.findAll({
        where: {
          service: IntegrationService.GitLab,
          [Op.and]: Sequelize.literal(
            `"issueSources"::jsonb @> '[{"owner": {"name": "${name}"}}]'`
          ),
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      })) as Integration<IntegrationType.Embed>[];

      if (!integrations) {
        Logger.warn(`GitLab group_destroy event without integration;`);
        return;
      }

      for (const integration of integrations) {
        const sources =
          integration.issueSources?.filter(
            (source) => name !== source.owner.name
          ) ?? [];

        integration.issueSources = sources;
        integration.changed("issueSources", true);
        await integration.save({ transaction });
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
    let integration: Integration<IntegrationType.Embed> | null = null;

    for (const owner of payload.owners) {
      integration = (await Integration.findOne({
        where: {
          service: IntegrationService.GitLab,
          "settings.github.installation.account.name": owner.name,
        },
      })) as Integration<IntegrationType.Embed> | null;

      if (integration) {break;}
    }

    if (!integration) {
      Logger.warn(`GitLab project_create event without integration;`);
      return;
    }

    let sources = integration.issueSources ?? [];

    await sequelize.transaction(async (transaction) => {
      await integration.reload({ lock: transaction.LOCK.UPDATE });
      sources.push({
        id: String(payload.project_id),
        name: payload.name,
        owner: {
          id: String(payload.project_namespace_id),
          name: payload.path_with_namespace.split("/").slice(0, -1).join("/"),
        },
        service: IntegrationService.GitLab,
      });

      integration.issueSources = sources;
      integration.changed("issueSources", true);
      await integration.save({ transaction });
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
