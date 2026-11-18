import { subDays } from "date-fns";
import { Op } from "sequelize";
import { Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { Team } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import CleanupDeletedTeamTask from "./CleanupDeletedTeamTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

export default class CleanupDeletedTeamsTask extends CronTask {
  public async perform({ limit, partition }: Props) {
    Logger.info(
      "task",
      `Permanently destroying upto ${limit} teams older than 30 days…`
    );
    const teams = await Team.findAll({
      attributes: ["id"],
      where: {
        deletedAt: {
          [Op.lt]: subDays(new Date(), 30),
        },
        ...this.getPartitionWhereClause("id", partition),
      },
      paranoid: false,
      limit,
    });

    for (const team of teams) {
      await new CleanupDeletedTeamTask().schedule({
        teamId: team.id,
      });
    }
  }

  public get cron() {
    return {
      interval: TaskInterval.Hour,
      partitionWindow: 15 * Minute.ms,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
