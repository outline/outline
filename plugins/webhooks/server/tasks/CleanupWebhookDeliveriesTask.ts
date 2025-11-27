import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { WebhookDelivery } from "@server/models";
import { TaskPriority } from "@server/queues/tasks/base/BaseTask";
import { CronTask, TaskInterval } from "@server/queues/tasks/base/CronTask";
import { Hour } from "@shared/utils/time";

export default class CleanupWebhookDeliveriesTask extends CronTask {
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

  public get cron() {
    return {
      interval: TaskInterval.Day,
      partitionWindow: Hour.ms,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
