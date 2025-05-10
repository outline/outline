import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Attachment } from "@server/models";
import { sequelize } from "@server/storage/database";
import BaseTask, { TaskPriority, TaskSchedule } from "./BaseTask";
import UpdateTeamAttachmentsSizeTask from "./UpdateTeamAttachmentsSizeTask";

type Props = {
  limit: number;
};

export default class UpdateTeamsAttachmentsSizeTask extends BaseTask<Props> {
  static cron = TaskSchedule.Day;

  public async perform({ limit }: Props) {
    Logger.info(
      "task",
      `Recalculating attachment sizes for upto ${limit} teams…`
    );

    // Find unique attachment teamIds created in the last day, update only
    // those teams' approximate attachment sizes
    await Attachment.findAllInBatches<Attachment>(
      {
        attributes: [
          [sequelize.fn("DISTINCT", sequelize.col("teamId")), "teamId"],
        ],
        where: {
          createdAt: {
            [Op.gt]: subDays(new Date(), 1),
          },
        },
        batchLimit: 100,
        raw: true,
      },
      async (rows) => {
        const teamIds = rows.map((row) => row.teamId);

        for (const teamId of teamIds) {
          await new UpdateTeamAttachmentsSizeTask().schedule({ teamId });
        }
      }
    );
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
