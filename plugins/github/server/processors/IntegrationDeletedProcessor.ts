import { App, Octokit } from "octokit";
import { IntegrationService, IntegrationType } from "@shared/types";
import env from "@server/env";
import { Integration } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import { IntegrationEvent, Event } from "@server/types";

export default class IntegrationDeletedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["integrations.delete"];

  private githubClient?: Octokit;

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

    this.githubClient = octokit;
  }

  async perform(event: Event) {
    switch (event.name) {
      case "integrations.delete":
        return this.integrationDeleted(event);
      default:
    }
  }

  async integrationDeleted(event: IntegrationEvent) {
    const integration = await Integration.findOne({
      where: {
        id: event.modelId,
      },
      paranoid: false,
    });
    if (!integration) {
      return;
    }

    // If GitHub, delete this installation
    if (integration.service === IntegrationService.GitHub) {
      const installationId = (integration as Integration<IntegrationType.Embed>)
        .settings?.github?.installation.id;

      if (installationId) {
        await this.githubClient?.request(
          "DELETE /app/installations/{installation_id}",
          {
            installation_id: installationId,
          }
        );
      }
    }

    await integration.destroy({ force: true });
  }
}
