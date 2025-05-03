import { subMonths } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { OAuthAuthorizationCode } from "@server/models";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";

type Props = Record<string, never>;

export default class CleanupOAuthAuthorizationCodeTask extends BaseTask<Props> {
  static cron = TaskSchedule.Day;

  public async perform() {
    Logger.info(
      "task",
      `Deleting OAuth authorization codes older than one month…`
    );
    const count = await OAuthAuthorizationCode.destroy({
      where: {
        expiresAt: {
          [Op.lt]: subMonths(new Date(), 1),
        },
      },
    });
    Logger.info("task", `${count} expired OAuth authorization codes deleted.`);
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
