import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { WebhookDelivery } from "@server/models";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  limit: number;
};

export default class CleanupWebhookDeliveriesTask extends BaseTask<Props> {
  public async perform({ limit }: Props) {
    Logger.info("task", `Deleting WebhookDeliveries older than one week…`);
    const deliveries = await WebhookDelivery.unscoped().findAll({
      where: {
        createdAt: {
          [Op.lt]: subDays(new Date(), 7),
        },
      },
      limit,
    });
    await Promise.all(
      deliveries.map((fileOperation) => fileOperation.destroy())
    );
    Logger.info("task", `${deliveries.length} old WebhookDeliveries deleted.`);
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
