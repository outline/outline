import { subDays } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { SearchQuery } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import { Minute } from "@shared/utils/time";

export default class CleanupOldSearchQueriesTask extends CronTask {
  public async perform({ partition }: Props) {
    // TODO: Hardcoded right now, configurable later
    const retentionDays = 365;
    const cutoffDate = subDays(new Date(), retentionDays);
    const maxSearchQueriesPerTask = 100000;
    let totalSearchQueriesDeleted = 0;

    try {
      await SearchQuery.findAllInBatches(
        {
          attributes: ["id"],
          where: {
            createdAt: {
              [Op.lt]: cutoffDate,
            },
            ...this.getPartitionWhereClause("id", partition),
          },
          batchLimit: 1000,
          totalLimit: maxSearchQueriesPerTask,
          order: [["createdAt", "ASC"]],
        },
        async (searchQueries) => {
          totalSearchQueriesDeleted += await SearchQuery.destroy({
            where: {
              id: {
                [Op.in]: searchQueries.map((searchQuery) => searchQuery.id),
              },
            },
          });
        }
      );
    } finally {
      if (totalSearchQueriesDeleted > 0) {
        Logger.info("task", `Deleted old search queries`, {
          totalSearchQueriesDeleted,
        });
      }
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
