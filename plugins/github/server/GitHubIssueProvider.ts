import { Endpoints } from "@octokit/types";
import {
  InstallationNewPermissionsAcceptedEvent,
  InstallationRepositoriesEvent,
  RepositoryRenamedEvent,
} from "@octokit/webhooks-types";
import { IssueSource } from "@shared/schema";
import { IntegrationService, IntegrationType } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Integration, IntegrationAuthentication } from "@server/models";
import { sequelize } from "@server/storage/database";
import { BaseIssueProvider } from "@server/utils/BaseIssueProvider";
import { GitHub } from "./github";

// This is needed to handle Octokit paginate response type mismatch.
type ReposForInstallation =
  Endpoints["GET /installation/repositories"]["response"]["data"]["repositories"];

export class GitHubIssueProvider extends BaseIssueProvider {
  constructor() {
    super(IntegrationService.GitHub);
  }

  async fetchSources(
    integration: Integration<IntegrationType.Embed>
  ): Promise<IssueSource[]> {
    const client = await GitHub.authenticateAsInstallation(
      integration.settings.github!.installation.id
    );

    const sources: IssueSource[] = [];

    for await (const response of client.requestRepos()) {
      const repos = response.data as unknown as ReposForInstallation;
      sources.push(
        ...repos.map<IssueSource>((repo) => ({
          id: String(repo.id),
          name: repo.name,
          owner: { id: String(repo.owner.id), name: repo.owner.login },
          service: IntegrationService.GitHub,
        }))
      );
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
    const hookId = headers["x-github-hook-id"] as string;
    const eventName = headers["x-github-event"] as string;
    const action = payload.action as string;

    if (!eventName || !action) {
      Logger.warn(
        `Received GitHub webhook without event name or action; hookId: ${hookId}, eventName: ${eventName}, action: ${action}`
      );
      return;
    }

    switch (eventName) {
      case "installation": {
        await this.handleInstallationEvent(payload, action);
        break;
      }

      case "installation_repositories": {
        await this.handleInstallationRepositoriesEvent(
          payload as unknown as InstallationRepositoriesEvent
        );
        break;
      }

      case "repository": {
        await this.handleRepositoryEvent(payload, action, hookId);
        break;
      }

      default:
    }
  }

  private async handleInstallationEvent(
    payload: Record<string, unknown>,
    action: string
  ): Promise<void> {
    if (action !== "new_permissions_accepted") {
      return;
    }

    const event = payload as unknown as InstallationNewPermissionsAcceptedEvent;
    const installationId = event.installation.id;
    const integration = await Integration.findOne({
      where: {
        service: IntegrationService.GitHub,
        "settings.github.installation.id": installationId,
      },
    });

    if (!integration) {
      Logger.warn(
        `GitHub installation new_permissions_accepted event without integration; installationId: ${installationId}`
      );
      return;
    }

    const sources = await this.fetchSources(integration);

    const client = await GitHub.authenticateAsInstallation(installationId);
    const installation = await client.requestAppInstallation(installationId);

    const scopes = Object.entries(installation.data.permissions).map(
      ([name, permission]) => `${name}:${permission}`
    );

    await sequelize.transaction(async (transaction) => {
      await integration.reload({
        include: {
          model: IntegrationAuthentication,
          as: "authentication",
          required: true,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const authentication = integration.authentication;

      if (!authentication) {
        Logger.warn(
          `GitHub integration without authentication; integrationId: ${integration.id}`
        );
        return;
      }

      authentication.scopes = scopes;
      await authentication.save({ transaction });

      integration.issueSources = sources;
      integration.changed("issueSources", true);
      await integration.save({ transaction });
    });
  }

  private async handleInstallationRepositoriesEvent(
    event: InstallationRepositoriesEvent
  ): Promise<void> {
    const installationId = event.installation.id;
    const account = event.installation.account;

    await sequelize.transaction(async (transaction) => {
      const integration = await Integration.findOne({
        where: {
          service: IntegrationService.GitHub,
          "settings.github.installation.id": installationId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!integration) {
        Logger.warn(
          `GitHub installation_repositories event without integration; installationId: ${installationId}`
        );
        return;
      }

      let sources = integration.issueSources ?? [];

      if (event.action === "added") {
        const addedSources = event.repositories_added.map<IssueSource>(
          (repo) => ({
            id: String(repo.id),
            name: repo.name,
            owner: {
              id: String(account.id),
              name: account.login,
            },
            service: IntegrationService.GitHub,
          })
        );
        sources.push(...addedSources);
      } else {
        const removedSourceIds = event.repositories_removed.map((repo) =>
          String(repo.id)
        );
        sources = sources.filter(
          (source) => !removedSourceIds.includes(source.id)
        );
      }

      integration.issueSources = sources;
      integration.changed("issueSources", true);
      await integration.save({ transaction });
    });
  }

  private async handleRepositoryEvent(
    payload: Record<string, unknown>,
    action: string,
    hookId: string
  ): Promise<void> {
    if (action !== "renamed") {
      return;
    }

    const event = payload as unknown as RepositoryRenamedEvent;
    const installationId = event.installation?.id;

    if (!installationId) {
      Logger.warn(
        `GitHub repository renamed event without installation ID; hookId: ${hookId}`
      );
      return;
    }

    const repoId = event.repository.id;
    const repoName = event.repository.name;

    await sequelize.transaction(async (transaction) => {
      const integration = await Integration.findOne({
        where: {
          service: IntegrationService.GitHub,
          "settings.github.installation.id": installationId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!integration) {
        Logger.warn(
          `GitHub repository renamed event without integration; installationId: ${installationId}`
        );
        return;
      }

      const source = integration.issueSources?.find(
        (s) => s.id === String(repoId)
      );

      if (!source) {
        Logger.info(
          "task",
          `No matching issue source found for repository ID: ${repoId}, integration ID: ${integration.id}`
        );
        return;
      }

      source.name = repoName;
      integration.changed("issueSources", true);
      await integration.save({ transaction });
    });
  }
}
