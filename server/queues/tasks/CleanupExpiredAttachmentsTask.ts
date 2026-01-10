import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Attachment } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

export default class CleanupExpiredAttachmentsTask extends CronTask {
  public async perform({ limit }: Props) {
    Logger.info("task", `Deleting expired attachments…`);
    const attachments = await Attachment.unscoped().findAll({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
      limit,
    });
    await Promise.all(attachments.map((attachment) => attachment.destroy()));
    Logger.info("task", `Removed ${attachments.length} attachments`);
  }

  public get cron() {
    return {
      interval: TaskInterval.Hour,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
