import { IssueSource } from "@shared/schema";
import { IntegrationService, IntegrationType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, IntegrationAuthentication } from "@server/models";
import { BaseIssueProvider } from "@server/utils/BaseIssueProvider";
import { GitLab } from "./gitlab";
import { sequelize } from "@server/storage/database";

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
      case "project_destroy":
        await this.createOrDestroyProject(payload, eventName);
        break;

      default:
        break;
    }
  }

  private async createOrDestroyProject(
    payload: Record<string, any>,
    eventName: string
  ) {
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
      Logger.warn(`GitLab ${eventName} event without integration;`);
      return;
    }

    let sources = integration.issueSources ?? [];

    await sequelize.transaction(async (transaction) => {
      if (eventName === "project_create") {
        sources.push({
          id: String(payload.project_id),
          name: payload.name,
          owner: {
            id: String(payload.project_namespace_id),
            name: payload.path_with_namespace.split("/").slice(0, -1).join("/"),
          },
          service: IntegrationService.GitLab,
        });
      } else {
        sources = sources.filter(
          (source) => String(payload.project_id) !== source.id
        );
      }

      integration.issueSources = sources;
      integration.changed("issueSources", true);
      await integration.save({ transaction });
    });
  }

  private async updateProject(payload: Record<string, any>) {
    let source: IssueSource | undefined;
    let integration: Integration<IntegrationType.Embed> | null = null;

    for (const owner of payload.owners) {
      integration = (await Integration.findOne({
        where: {
          service: IntegrationService.GitLab,
          "settings.gitlab.installation.account.name": owner.name,
        },
      })) as Integration<IntegrationType.Embed> | null;

      if (integration) {
        source = integration.issueSources?.find(
          (s) => s.id === String(payload.project_id)
        );
        break;
      }
    }

    if (!source || !integration) {
      Logger.info(
        "task",
        `No matching issue source found for project ID: ${payload.project_id}, integration ID: ${integration?.id ?? "undefined"}`
      );
      return;
    }

    await sequelize.transaction(async (transaction) => {
      source.name = payload.name;
      source.owner.name = payload.path_with_namespace
        .split("/")
        .slice(0, -1)
        .join("/");
      source.owner.id = String(payload.project_namespace_id);
      integration.changed("issueSources", true);
      await integration.save({ transaction });
    });
  }
}
