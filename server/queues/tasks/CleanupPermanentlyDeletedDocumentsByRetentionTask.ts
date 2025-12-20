import { Op, Sequelize } from "sequelize";
import { subDays } from "date-fns";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import { BaseTask, TaskPriority } from "./base/BaseTask";
import type { PartitionInfo } from "./base/BaseTask";

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
    const defaultRetentionDays = TeamPreferenceDefaults[
      TeamPreference.DataRetentionDays
    ] as number;
    const isDefault = retentionDays === defaultRetentionDays;

    Logger.info(
      "task",
      `Permanently destroying upto ${limit} documents past ${retentionDays} day retention timeout…`
    );

    const documents = await Document.scope([
      "withDrafts",
      "withoutState",
    ]).findAll({
      where: {
        permanentlyDeletedAt: {
          [Op.lt]: subDays(new Date(), retentionDays),
        },
        [Op.and]: [
          Sequelize.literal(
            isDefault
              ? `NOT EXISTS (
                  SELECT 1 FROM teams
                  WHERE teams.id = "document"."teamId"
                  AND preferences->>'${TeamPreference.DataRetentionDays}' IS NOT NULL
                  AND (preferences->>'${TeamPreference.DataRetentionDays}')::int != ${defaultRetentionDays}
                )`
              : `EXISTS (
                  SELECT 1 FROM teams
                  WHERE teams.id = "document"."teamId"
                  AND (preferences->>'${TeamPreference.DataRetentionDays}')::int = ${retentionDays}
                )`
          ),
        ],
        ...this.getPartitionWhereClause("id", partition),
      },
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
