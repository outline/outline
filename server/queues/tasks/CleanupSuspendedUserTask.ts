import { sequelize } from "@server/database/sequelize";
import Logger from "@server/logging/Logger";
import { WebhookSubscription, ApiKey, User } from "@server/models";
import BaseTask from "./BaseTask";

type Props = {
  userId: string;
};

/**
 * Task to disable mechanisms for exporting data from a suspended user, currently
 * this is done by destroying associated Api Keys and disabling webhooks.
 */
export default class CleanupSuspendedUserTask extends BaseTask<Props> {
  public async perform(props: Props) {
    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(props.userId, { rejectOnEmpty: true });
      if (!user.isSuspended) {
        Logger.info(
          "task",
          `Aborted CleanupSuspendedUserTask for user ${props.userId} because user is not suspended`
        );
        return;
      }

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
        `Disabled ${subscriptions.length} webhooks for suspended user ${props.userId}`
      );

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
        `Destroyed ${apiKeys.length} api keys for suspended user ${props.userId}`
      );
    });
  }
}
