import { IntegrationService } from "@shared/types";
import { BaseTask } from "@server/queues/tasks/base/BaseTask";
import { Hook, PluginManager } from "@server/utils/PluginManager";

type Props = {
  headers: Record<string, unknown>;
  payload: Record<string, unknown>;
};

export default class GitHubWebhookTask extends BaseTask<Props> {
  public async perform({ headers, payload }: Props): Promise<void> {
    const plugins = PluginManager.getHooks(Hook.IssueProvider);
    const plugin = plugins.find(
      (p) => p.value.service === IntegrationService.GitHub
    );

    if (!plugin) {
      return;
    }

    await plugin.value.handleWebhook({
      headers,
      payload,
    });
  }
}
