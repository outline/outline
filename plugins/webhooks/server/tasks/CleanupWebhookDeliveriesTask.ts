import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { WebhookDelivery } from "@server/models";
import BaseTask, {
  TaskPriority,
  TaskSchedule,
} from "@server/queues/tasks/BaseTask";

type Props = Record<string, never>;

export default class CleanupWebhookDeliveriesTask extends BaseTask<Props> {
  static cron = TaskSchedule.Day;

  public async perform() {
    Logger.info("task", `Deleting WebhookDeliveries older than one week…`);
    const count = await WebhookDelivery.unscoped().destroy({
      where: {
        createdAt: {
          [Op.lt]: subDays(new Date(), 7),
        },
      },
    });
    Logger.info("task", `${count} old WebhookDeliveries deleted.`);
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
