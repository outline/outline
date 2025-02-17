import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Attachment } from "@server/models";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";

type Props = {
  limit: number;
};

export default class CleanupExpiredAttachmentsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

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

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
