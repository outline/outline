import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Team } from "@server/models";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";
import CleanupDeletedTeamTask from "./CleanupDeletedTeamTask";

type Props = {
  limit: number;
};

export default class CleanupDeletedTeamsTask extends BaseTask<Props> {
  static cron = TaskSchedule.Hour;

  public async perform({ limit }: Props) {
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

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
