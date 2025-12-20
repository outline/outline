import { Op, Sequelize } from "sequelize";
import { subDays } from "date-fns";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import Logger from "@server/logging/Logger";
import { Document, Team } from "@server/models";
import { TeamPreferenceDefaults } from "@shared/constants";
import { TeamPreference } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { TaskPriority } from "./base/BaseTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import type { Props as BaseProps } from "./base/CronTask";

type Props = BaseProps & {
  /** The retention period in days to process in this tranche. */
  retentionDays?: number;
  /** Whether to process teams using the default retention period. */
  isDefault?: boolean;
};

export default class CleanupPermanentlyDeletedDocumentsTask extends CronTask<Props> {
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
   * Identifies all unique retention periods and schedules a worker task for each.
   */
  private async coordinate(props: Props) {
    const defaultRetentionDays = TeamPreferenceDefaults[
      TeamPreference.DataRetentionDays
    ] as number;

    // Find all unique custom retention periods currently in use by teams.
    const customRetentionPeriods = await Team.findAll({
      attributes: [
        [
          Sequelize.fn(
            "DISTINCT",
            Sequelize.literal(
              `(preferences->>'${TeamPreference.DataRetentionDays}')::int`
            )
          ),
          "days",
        ],
      ],
      where: Sequelize.literal(
        `preferences->>'${TeamPreference.DataRetentionDays}' IS NOT NULL AND (preferences->>'${TeamPreference.DataRetentionDays}')::int != ${defaultRetentionDays}`
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
      `Scheduled ${customRetentionPeriods.length + 1} tranches for document cleanup`
    );
  }

  /**
   * Processes a single tranche of documents based on a specific retention period.
   */
  private async processTranche({
    limit,
    partition,
    retentionDays,
    isDefault,
  }: Props) {
    const defaultRetentionDays = TeamPreferenceDefaults[
      TeamPreference.DataRetentionDays
    ] as number;
    const days = isDefault ? defaultRetentionDays : (retentionDays as number);

    Logger.info(
      "task",
      `Permanently destroying upto ${limit} documents past ${days} day retention timeout…`
    );

    const documents = await Document.scope([
      "withDrafts",
      "withoutState",
    ]).findAll({
      where: {
        permanentlyDeletedAt: {
          [Op.lt]: subDays(new Date(), days),
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
                  AND (preferences->>'${TeamPreference.DataRetentionDays}')::int = ${days}
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

  public get cron() {
    return {
      interval: TaskInterval.Hour,
      partitionWindow: 15 * Minute.ms,
    };
  }
}
