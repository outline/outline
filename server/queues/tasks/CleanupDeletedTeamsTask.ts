import { subDays } from "date-fns";
import { Op } from "sequelize";
import teamPermanentDeleter from "@server/commands/teamPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Team } from "@server/models";
import BaseTask, { TaskPriority } from "./BaseTask";

type Props = {
  limit: number;
};

export default class CleanupDeletedTeamsTask extends BaseTask<Props> {
  public async perform({ limit }: Props) {
    Logger.info(
      "task",
      `Permanently destroying upto ${limit} teams older than 30 days…`
    );
    const teams = await Team.findAll({
      where: {
        deletedAt: {
          [Op.lt]: subDays(new Date(), 30),
        },
      },
      paranoid: false,
      limit,
    });

    for (const team of teams) {
      await teamPermanentDeleter(team);
    }
    Logger.info("task", `Destroyed ${teams.length} teams`);
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
