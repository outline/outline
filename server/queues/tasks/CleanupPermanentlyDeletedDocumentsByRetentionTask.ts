import { Op } from "sequelize";
import { subDays } from "date-fns";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import type { RetentionPreference } from "@server/utils/retention";
import { teamRetentionPeriodFilter } from "@server/utils/retention";
import { TeamPreference } from "@shared/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";
import type { PartitionInfo } from "./base/BaseTask";

const preference: RetentionPreference = TeamPreference.DataRetentionDays;

export type Props = {
  /** The retention period in days to process in this tranche. */
  retentionDays: number;
  /** The maximum number of documents to destroy in this task. */
  limit: number;
  /** Partition information for distributing work. */
  partition?: PartitionInfo;
};

/**
 * A task that handles the permanent destruction of documents past their retention period.
 */
export default class CleanupPermanentlyDeletedDocumentsByRetentionTask extends BaseTask<Props> {
  public async perform({ limit, partition, retentionDays }: Props) {
    // Infinite retention means documents are never permanently deleted.
    if (retentionDays === 0) {
      return;
    }

    Logger.debug(
      "task",
      `Permanently destroying upto ${limit} documents past ${retentionDays} day retention timeout…`
    );

    const team = teamRetentionPeriodFilter(
      preference,
      retentionDays,
      "document"
    );

    const documents = await Document.scope([
      "withDrafts",
      "withoutState",
    ]).findAll({
      where: {
        destroyedAt: {
          [Op.lt]: subDays(new Date(), retentionDays),
        },
        [Op.and]: [team.where],
        ...this.getPartitionWhereClause("id", partition),
      },
      replacements: team.replacements,
      paranoid: false,
      limit,
    });

    if (documents.length > 0) {
      const countDeletedDocument = await documentPermanentDeleter(documents);
      Logger.info("task", `Destroyed ${countDeletedDocument} documents`);
    }
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
