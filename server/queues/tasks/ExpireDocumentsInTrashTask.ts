import { Op, Sequelize } from "sequelize";
import { subDays } from "date-fns";
import Logger from "@server/logging/Logger";
import { Document, Team } from "@server/models";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import type { Props as BaseProps } from "./base/CronTask";

type Props = BaseProps & {
  /** The trash retention period in days to process in this tranche. */
  retentionDays?: number;
  /** Whether to process teams using the default trash retention period. */
  isDefault?: boolean;
};

export default class ExpireDocumentsInTrashTask extends CronTask<Props> {
  public async perform(props: Props) {
    const { retentionDays, isDefault } = props;

    // If neither retentionDays nor isDefault is set, this is the coordinator run triggered by cron.
    if (retentionDays === undefined && isDefault === undefined) {
      await this.coordinate(props);
      return;
    }

    await this.processTranche(props);
  }

  /**
   * Identifies all unique trash retention periods and schedules a worker task for each.
   */
  private async coordinate(props: Props) {
    const defaultTrashRetentionDays = TeamPreferenceDefaults[
      TeamPreference.TrashRetentionDays
    ] as number;

    // Find all unique custom trash retention periods currently in use by teams.
    const customRetentionPeriods = await Team.findAll({
      attributes: [
        [
          Sequelize.fn(
            "DISTINCT",
            Sequelize.literal(
              `(preferences->>'${TeamPreference.TrashRetentionDays}')::int`
            )
          ),
          "days",
        ],
      ],
      where: Sequelize.literal(
        `preferences->>'${TeamPreference.TrashRetentionDays}' IS NOT NULL AND (preferences->>'${TeamPreference.TrashRetentionDays}')::int != ${defaultTrashRetentionDays}`
      ),
      raw: true,
    });

    // Schedule a task for each unique custom retention period.
    for (const row of customRetentionPeriods) {
      const days = (row as any).days as number;
      await this.schedule({
        ...props,
        retentionDays: days,
      });
    }

    // Schedule a task for the default retention period.
    await this.schedule({
      ...props,
      isDefault: true,
    });

    Logger.info(
      "task",
      `Scheduled ${customRetentionPeriods.length + 1} tranches for marking documents for permanent deletion`
    );
  }

  /**
   * Processes a single tranche of documents based on a specific trash retention period.
   */
  private async processTranche({ partition, retentionDays, isDefault }: Props) {
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

  public get cron() {
    return {
      interval: TaskInterval.Hour,
      partitionWindow: 15 * Minute.ms,
    };
  }
}
