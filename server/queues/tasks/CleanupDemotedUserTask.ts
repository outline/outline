import Logger from "@server/logging/Logger";
import { WebhookSubscription, ApiKey, User } from "@server/models";
import { cannot } from "@server/policies";
import { sequelize } from "@server/storage/database";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  userId: string;
};

/**
 * Task to disable mechanisms for exporting data from a suspended or demoted user,
 * currently this is done by destroying associated Api Keys and disabling webhooks.
 */
export default class CleanupDemotedUserTask extends BaseTask<Props> {
  public async perform(props: Props) {
    const user = await User.scope("withTeam").findByPk(props.userId, {
      rejectOnEmpty: true,
    });

    await sequelize.transaction(async (transaction) => {
      if (cannot(user, "createWebhookSubscription", user.team)) {
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

      if (cannot(user, "createApiKey", user.team)) {
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

  public get options() {
    return {
      priority: TaskPriority.Background,
    };
  }
}
