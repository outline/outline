import { Integration, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import BaseTask from "./BaseTask";

const plugins = PluginManager.getHooks(Hook.IssueProvider);

type Props = {
  integrationId: string;
  actorId: string;
};

export default class CacheIssueSourcesTask extends BaseTask<Props> {
  async perform({ integrationId, actorId }: Props) {
    await sequelize.transaction(async (transaction) => {
      const [integration, actor] = await Promise.all([
        Integration.findByPk(integrationId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }),
        User.findByPk(actorId),
      ]);
      if (!integration || !actor) {
        return;
      }

      const plugin = plugins.find(
        (p) => p.value.service === integration.service
      );
      if (!plugin) {
        return;
      }

      const sources = await plugin.value.fetchSources(integration);
      integration.issueSources = sources;
      await integration.save({ transaction });
    });
  }
}
