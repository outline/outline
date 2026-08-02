import type { Utils } from "sequelize";
import { QueryTypes, Sequelize } from "sequelize";
import { TeamPreferenceDefaults } from "@shared/constants";
import type { RetentionPeriodPreset, TeamPreference } from "@shared/types";
import { sequelize } from "@server/storage/database";

/** Team preferences that express a retention period, in days. */
export type RetentionPreference =
  | TeamPreference.TrashRetentionDays
  | TeamPreference.DataRetentionDays;

/**
 * The SQL alias of the table holding the `teamId` column being matched against.
 * Sequelize aliases a table by its model name when selecting, and by its table
 * name when updating.
 */
type TeamOwnedAlias = "document" | "documents";

/**
 * The retention period applied to teams that have not set an explicit
 * preference. Falls back to infinite retention, so a missing default can never
 * cause data to be deleted sooner than intended.
 *
 * @param preference the retention preference to read.
 * @returns the default retention period in days.
 */
export function getDefaultRetentionPeriod(
  preference: RetentionPreference
): RetentionPeriodPreset {
  return TeamPreferenceDefaults[preference] ?? 0;
}

/**
 * Returns every retention period, in days, that is currently in use across all
 * teams for the given preference. The default period is always included so that
 * teams without an explicit preference are covered, and periods of zero
 * (infinite retention) are omitted as they never require processing.
 *
 * Deriving the periods from the data rather than from a fixed list of presets
 * ensures teams are never silently skipped if the presets offered in the UI
 * change, or if a team holds a value that is no longer offered.
 *
 * @param preference the retention preference to read.
 * @returns a sorted list of retention periods in days.
 */
export async function getRetentionPeriodsInUse(
  preference: RetentionPreference
): Promise<number[]> {
  const rows = await sequelize.query<{ days: string | null }>(
    `SELECT DISTINCT preferences->>:preference AS days FROM teams WHERE preferences->>:preference IS NOT NULL`,
    {
      type: QueryTypes.SELECT,
      replacements: { preference },
    }
  );

  const periods = new Set<number>([getDefaultRetentionPeriod(preference)]);

  for (const row of rows) {
    const days = Number(row.days);
    // Preferences are free-form JSON, values that are not a positive whole
    // number of days cannot be acted on and are ignored.
    if (Number.isInteger(days) && days > 0) {
      periods.add(days);
    }
  }

  periods.delete(0);

  return [...periods].sort((a, b) => a - b);
}

/**
 * Builds a filter matching rows that belong to a team configured with the given
 * retention period. Teams that have not set the preference are matched by the
 * default period.
 *
 * Comparison is performed on the raw JSON text rather than casting to an integer
 * so that an unexpected value stored against the preference cannot fail the
 * query for every other team in the same batch.
 *
 * @param preference the retention preference to match on.
 * @param retentionDays the retention period in days.
 * @param alias the SQL alias of the table holding the `teamId` column.
 * @returns the where clause literal and the replacements it requires.
 */
export function teamRetentionPeriodFilter(
  preference: RetentionPreference,
  retentionDays: number,
  alias: TeamOwnedAlias
): { where: Utils.Literal; replacements: Record<string, string> } {
  const isDefault = retentionDays === getDefaultRetentionPeriod(preference);
  const matchesPreference = isDefault
    ? `(preferences->>:preference IS NULL OR preferences->>:preference = :retentionDaysText)`
    : `preferences->>:preference = :retentionDaysText`;

  return {
    where: Sequelize.literal(
      `EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = "${alias}"."teamId"
        AND ${matchesPreference}
      )`
    ),
    replacements: {
      preference,
      retentionDaysText: String(retentionDays),
    },
  };
}
