import { Op, Sequelize } from "sequelize";
import { subDays } from "date-fns";
import Logger from "@server/logging/Logger";
import { Document } from "@server/models";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import type { PartitionInfo} from "./base/BaseTask";
import { BaseTask, TaskPriority } from "./base/BaseTask";

export type Props = {
  /** The trash retention period in days to process in this tranche. */
  retentionDays: number;
  /** Partition information for distributing work. */
  partition?: PartitionInfo;
};

/**
 * A task that marks documents in the trash for permanent deletion based on a retention period.
 */
export default class ExpireDocumentsInTrashByRetentionTask extends BaseTask<Props> {
  public async perform(props: Props) {
    const { partition, retentionDays } = props;
    const defaultTrashRetentionDays = TeamPreferenceDefaults[
      TeamPreference.TrashRetentionDays
    ] as number;
    const isDefault = retentionDays === defaultTrashRetentionDays;

    Logger.info(
      "task",
      `Marking documents past ${retentionDays} day trash timeout as pending permanent deletion…`
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
            [Op.lt]: subDays(new Date(), retentionDays),
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
                    AND (preferences->>'${TeamPreference.TrashRetentionDays}')::int = ${retentionDays}
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
