import Logger from "@server/logging/Logger";
import { WebhookSubscription, ApiKey, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import BaseTask from "./BaseTask";

type Props = {
  userId: string;
};

/**
 * Task to disable mechanisms for exporting data from a suspended or demoted user,
 * currently this is done by destroying associated Api Keys and disabling webhooks.
 */
export default class CleanupDemotedUserTask extends BaseTask<Props> {
  public async perform(props: Props) {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(props.userId, { rejectOnEmpty: true });

      if (user.isSuspended || !user.isAdmin) {
        const subscriptions = await WebhookSubscription.findAll({
          where: {
            createdById: props.userId,
            enabled: true,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        await Promise.all(
          subscriptions.map((subscription) =>
            subscription.disable({ transaction })
          )
        );
        Logger.info(
          "task",
          `Disabled ${subscriptions.length} webhooks for user ${props.userId}`
        );
      }

      if (user.isSuspended || user.isViewer) {
        const apiKeys = await ApiKey.findAll({
          where: {
            userId: props.userId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        await Promise.all(
          apiKeys.map((apiKey) => apiKey.destroy({ transaction }))
        );
        Logger.info(
          "task",
          `Destroyed ${apiKeys.length} api keys for user ${props.userId}`
        );
      }
    });
  }
}
