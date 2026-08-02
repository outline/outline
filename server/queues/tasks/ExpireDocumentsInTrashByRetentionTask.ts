import { Op } from "sequelize";
import { subDays } from "date-fns";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import type { RetentionPreference } from "@server/utils/retention";
import { teamRetentionPeriodFilter } from "@server/utils/retention";
import { TeamPreference } from "@shared/types";
import type { PartitionInfo } from "./base/BaseTask";
import { BaseTask, TaskPriority } from "./base/BaseTask";

const preference: RetentionPreference = TeamPreference.TrashRetentionDays;

export type Props = {
  /** The trash retention period in days to process in this tranche. */
  retentionDays: number;
  /** The maximum number of documents to expire in this task. */
  limit: number;
  /** Partition information for distributing work. */
  partition?: PartitionInfo;
};

/**
 * A task that marks documents in the trash for permanent deletion based on a retention period.
 */
export default class ExpireDocumentsInTrashByRetentionTask extends BaseTask<Props> {
  public async perform({ limit, partition, retentionDays }: Props) {
    // Infinite retention means documents are never expired from trash.
    if (retentionDays === 0) {
      return;
    }

    Logger.debug(
      "task",
      `Marking upto ${limit} documents past ${retentionDays} day trash timeout as pending permanent deletion…`
    );

    const team = teamRetentionPeriodFilter(
      preference,
      retentionDays,
      "document"
    );

    // The batch is selected before updating as Postgres does not support a limit
    // on UPDATE, and an unbounded update would hold locks across the entire table.
    const documents = await Document.unscoped().findAll({
      attributes: ["id"],
      where: {
        deletedAt: {
          [Op.lt]: subDays(new Date(), retentionDays),
        },
        destroyedAt: {
          [Op.is]: null,
        },
        [Op.and]: [team.where],
        ...this.getPartitionWhereClause("id", partition),
      },
      replacements: team.replacements,
      paranoid: false,
      limit,
    });

    if (!documents.length) {
      return;
    }

    // Documents that have been in the trash for longer than the retention period
    // move from the trash to pending permanent deletion.
    const [count] = await Document.unscoped().update(
      {
        destroyedAt: new Date(),
      },
      {
        where: {
          id: documents.map((document) => document.id),
          destroyedAt: {
            [Op.is]: null,
          },
        },
        paranoid: false,
      }
    );

    Logger.info("task", `Marked ${count} documents for permanent deletion`);
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
