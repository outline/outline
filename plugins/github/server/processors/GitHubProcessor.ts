import { App, Octokit } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import env from "@server/env";
import { Integration, IntegrationAuthentication } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import { sequelize } from "@server/storage/database";
import { IntegrationEvent, Event } from "@server/types";

export default class GitHubProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["integrations.delete"];

  private client?: Octokit;

  constructor() {
    super();
    if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
      return;
    }
    const { octokit } = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: Buffer.from(env.GITHUB_APP_PRIVATE_KEY, "base64").toString(
        "ascii"
      ),
    });

    this.client = octokit;
  }

  async perform(event: Event) {
    switch (event.name) {
      case "integrations.delete":
        return this.integrationDeleted(event);
      default:
    }
  }

  async integrationDeleted(event: IntegrationEvent) {
    const integration = (await Integration.findOne({
      where: {
        id: event.modelId,
        service: IntegrationService.GitHub,
      },
      paranoid: false,
    })) as Integration<IntegrationType.Embed>;
    if (!integration) {
      return;
    }

    const installationId = integration.settings?.github?.installation.id;

    if (installationId) {
      await this.client?.request(
        "DELETE /app/installations/{installation_id}",
        {
          installation_id: installationId,
        }
      );
    }

    await sequelize.transaction(async (transaction) => {
      await integration.destroy({ transaction, force: true });
      // also remove the corresponding authentication if it exists
      if (integration.authenticationId) {
        await IntegrationAuthentication.destroy({
          where: {
            id: integration.authenticationId,
          },
          transaction,
        });
      }
    });
  }
}
