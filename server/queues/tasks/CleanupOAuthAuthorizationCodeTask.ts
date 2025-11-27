import { subMonths } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { OAuthAuthorizationCode } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";

export default class CleanupOAuthAuthorizationCodeTask extends CronTask {
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

  public get cron() {
    return {
      interval: TaskInterval.Day,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
