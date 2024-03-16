import { Integration } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import { IntegrationEvent, Event } from "@server/types";
import { Hook, PluginManager } from "@server/utils/PluginManager";

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

    const uninstallHooks = PluginManager.getHooks(Hook.Uninstall);
    for (const hook of uninstallHooks) {
      await hook.value(integration);
    }

    await integration.destroy({ force: true });
  }
}
