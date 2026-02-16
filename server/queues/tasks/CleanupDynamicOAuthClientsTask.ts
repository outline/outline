import { subDays, subHours } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { OAuthClient } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Deletes dynamically registered OAuth clients (createdById is null) that are
 * either never used (lastActiveAt is null) after 48 hours, or that have been
 * used but inactive for 30 days.
 */
export default class CleanupDynamicOAuthClientsTask extends CronTask {
  public async perform({ limit }: Props) {
    const now = new Date();
    const neverUsedCutoff = subHours(now, 48);
    const inactiveCutoff = subDays(now, 30);

    const count = await OAuthClient.unscoped().destroy({
      where: {
        createdById: null,
        [Op.or]: [
          {
            // Never used and created more than 48 hours ago.
            lastActiveAt: null,
            createdAt: { [Op.lt]: neverUsedCutoff },
          },
          {
            // Used but inactive for more than 30 days.
            lastActiveAt: { [Op.lt]: inactiveCutoff },
          },
        ],
      },
      limit,
      force: true,
    });

    if (count > 0) {
      Logger.info("task", `Deleted dynamic OAuth clients`, {
        count,
      });
    }
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
