import type { IssueSource } from "@shared/schema";
import { IntegrationService, type IntegrationType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, IntegrationAuthentication } from "@server/models";
import { BaseIssueProvider } from "@server/utils/BaseIssueProvider";
import { GitLab } from "./gitlab";
import { sequelize } from "@server/storage/database";
import { Op } from "sequelize";

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
      const projects = await GitLab.getProjects({
        accessToken: integration.authentication.token,
        teamId: integration.teamId,
      });

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
    const hookId = headers["x-gitlab-webhook-uuid"] as string;
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
      case "repository_update":
        await this.createProject(payload);
        break;
      case "project_destroy":
        await this.destroyProject(payload);
        break;
      case "group_rename":
      case "user_rename":
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
    const name = payload.old_full_path ?? payload.old_username;
    const where = {
      service: IntegrationService.GitLab,
      [Op.and]: sequelize.literal(`"issueSources"::jsonb @> :jsonCondition`),
    };
    const jsonCondition = JSON.stringify([{ owner: { name } }]);

    await sequelize.transaction(async (transaction) => {
      const integration = (await Integration.findOne({
        where,
        replacements: { jsonCondition },
        lock: transaction.LOCK.UPDATE,
        transaction,
      })) as Integration<IntegrationType.Embed>;

      if (!integration) {
        Logger.warn(`GitLab namespace_update event without integration;`);
        return;
      }

      const sources = integration.issueSources ?? [];
      const updatedSources = sources.map((source) => {
        if (source.owner.name === name) {
          return {
            ...source,
            owner: {
              id: payload.group_id || source.owner.id,
              name: payload.full_path ?? payload.username,
            },
          };
        }
        return source;
      });

      integration.issueSources = updatedSources;
      integration.changed("issueSources", true);
      await integration.save({ transaction });
    });
  }

  private async destroyNamespace(payload: Record<string, any>) {
    let replacements = {};
    const whereCondition: any = {
      service: IntegrationService.GitLab,
    };

    if (payload.user_id) {
      whereCondition["settings.gitlab.installation.account.id"] =
        payload.user_id;
    } else if (payload.full_path) {
      whereCondition[Op.and] = sequelize.literal(
        `"issueSources"::jsonb @> :jsonCondition`
      );
      replacements = {
        jsonCondition: JSON.stringify([{ owner: { name: payload.full_path } }]),
      };
    }

    await sequelize.transaction(async (transaction) => {
      const integrations = (await Integration.findAll({
        where: whereCondition,
        replacements,
        lock: transaction.LOCK.UPDATE,
        transaction,
      })) as Integration<IntegrationType.Embed>[];

      if (!integrations.length) {
        Logger.warn(`GitLab namespace_destroy event without integration;`);
        return;
      }

      for (const integration of integrations) {
        if (payload.full_path) {
          const sources =
            integration.issueSources?.filter(
              (source) => payload.full_path !== source.owner.name
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
          [Op.and]: sequelize.where(
            sequelize.literal(`"issueSources"::jsonb @> :projectJson`),
            Op.eq,
            true
          ),
        },
        replacements: {
          projectJson: JSON.stringify([{ id: String(payload.project_id) }]),
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!integrations.length) {
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
    const createEvent = payload.changes.some((p: { before: string }) =>
      /^0{40}$/.test(p.before)
    );

    if (!createEvent) {
      return;
    }
    await sequelize.transaction(async (transaction) => {
      const integration = (await Integration.findOne({
        where: {
          service: IntegrationService.GitLab,
          "settings.gitlab.installation.account.id": payload.user_id,
        },
        lock: transaction.LOCK.UPDATE,
      })) as Integration<IntegrationType.Embed>;

      if (!integration) {
        Logger.warn(`GitLab project_create event without integration;`);
        return;
      }

      const project = payload.project;
      const owner = {
        id: "", // namespace.id is not provided in this webhook payload
        name: project.path_with_namespace.split("/").slice(0, -1).join("/"),
      };
      const sources = integration.issueSources ?? [];
      sources.push({
        id: String(payload.project_id),
        name: project.name,
        service: IntegrationService.GitLab,
        owner,
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
          [Op.and]: sequelize.where(
            sequelize.literal(`"issueSources"::jsonb @> :projectJson`),
            Op.eq,
            true
          ),
        },
        replacements: {
          projectJson: JSON.stringify([{ id: String(payload.project_id) }]),
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!integrations.length) {
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
