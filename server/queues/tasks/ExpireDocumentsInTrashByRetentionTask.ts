import { Op } from "sequelize";
import { subDays } from "date-fns";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { sequelizeReadOnly } from "@server/storage/database";
import type { RetentionPreference } from "@shared/types";
import { TeamPreference } from "@shared/types";
import { Minute } from "@shared/utils/time";
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

    const team = Document.retentionPeriodFilter(preference, retentionDays);

    // The batch is selected before updating as Postgres does not support a limit
    // on UPDATE, and an unbounded update would hold locks across the entire table.
    const documents = await sequelizeReadOnly.transaction((transaction) =>
      Document.unscoped().findAll({
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
        transaction,
      })
    );

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
      attempts: 3,
      backoff: {
        type: "exponential",
        // Wait until the active partition window has ended before retrying.
        delay: 15 * Minute.ms,
      },
      priority: TaskPriority.Background,
    };
  }
}
