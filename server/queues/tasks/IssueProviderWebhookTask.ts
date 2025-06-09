import { IssueTrackerIntegrationService } from "@shared/types";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import BaseTask from "./BaseTask";

type Props = {
  service: IssueTrackerIntegrationService;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
};

export default class IssueProviderWebhookTask extends BaseTask<Props> {
  async perform({ service, payload, headers }: Props) {
    const plugins = PluginManager.getHooks(Hook.IssueProvider);
    const plugin = plugins.find((p) => p.value.service === service);
    if (!plugin) {
      return;
    }

    await plugin.value.handleWebhook({ payload, headers });
  }
}
