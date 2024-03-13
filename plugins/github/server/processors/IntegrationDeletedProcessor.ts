import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import { IntegrationEvent, Event } from "@server/types";
import { githubApp } from "../github";

export default class IntegrationDeletedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["integrations.delete"];

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
        await githubApp.deleteInstallation(installationId);
      }
    }

    await integration.destroy({ force: true });
  }
}
