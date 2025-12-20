import { Op, Sequelize } from "sequelize";
import { subDays } from "date-fns";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import { BaseTask, PartitionInfo, TaskPriority } from "./base/BaseTask";

export type Props = {
  /** The trash retention period in days to process in this tranche. */
  retentionDays?: number;
  /** Whether to process teams using the default trash retention period. */
  isDefault?: boolean;
  /** Partition information for distributing work. */
  partition?: PartitionInfo;
};

export default class ExpireDocumentsInTrashByRetentionTask extends BaseTask<Props> {
  /**
   * Processes a single tranche of documents based on a specific trash retention period.
   *
   * @param props Properties to be used by the task
   */
  public async perform(props: Props) {
    const { partition, retentionDays, isDefault } = props;
    const defaultTrashRetentionDays = TeamPreferenceDefaults[
      TeamPreference.TrashRetentionDays
    ] as number;
    const days = isDefault
      ? defaultTrashRetentionDays
      : (retentionDays as number);

    Logger.info(
      "task",
      `Marking documents past ${days} day trash timeout as pending permanent deletion…`
    );

    // Mark documents that have been in the trash for longer than the retention period.
    // This moves them from "Trash" to "Pending Permanent Deletion" (Retention phase).
    const [count] = await Document.unscoped().update(
      {
        permanentlyDeletedAt: new Date(),
      },
      {
        where: {
          deletedAt: {
            [Op.lt]: subDays(new Date(), days),
          },
          permanentlyDeletedAt: {
            [Op.is]: null,
          },
          [Op.and]: [
            Sequelize.literal(
              isDefault
                ? `NOT EXISTS (
                    SELECT 1 FROM teams
                    WHERE teams.id = "documents"."teamId"
                    AND preferences->>'${TeamPreference.TrashRetentionDays}' IS NOT NULL
                    AND (preferences->>'${TeamPreference.TrashRetentionDays}')::int != ${defaultTrashRetentionDays}
                  )`
                : `EXISTS (
                    SELECT 1 FROM teams
                    WHERE teams.id = "documents"."teamId"
                    AND (preferences->>'${TeamPreference.TrashRetentionDays}')::int = ${days}
                  )`
            ),
          ],
          ...this.getPartitionWhereClause("id", partition),
        },
        paranoid: false,
      }
    );

    if (count > 0) {
      Logger.info("task", `Marked ${count} documents for permanent deletion`);
    }
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
