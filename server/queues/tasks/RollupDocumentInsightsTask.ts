import { QueryTypes } from "sequelize";
import { Day, Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { sequelize } from "@server/storage/database";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Number of recent days to (re)compute on each run, in addition to the current
 * day. Reprocessing the most recent days lets late-arriving writes (slow
 * workers, out-of-order event emission) settle into the rollup. The upsert is
 * idempotent.
 */
const RECOMPUTE_DAYS = 2;

export default class RollupDocumentInsightsTask extends CronTask {
  public async perform({ partition }: Props) {
    const [startUuid, endUuid] = this.getPartitionBounds(partition);

    for (let offset = RECOMPUTE_DAYS; offset >= 0; offset--) {
      const date = new Date(Date.now() - offset * Day.ms)
        .toISOString()
        .slice(0, 10);
      await this.rollupDay(date, startUuid, endUuid);
    }
  }

  private async rollupDay(
    date: string,
    startUuid: string,
    endUuid: string
  ): Promise<void> {
    const [{ upserted }] = await sequelize.query<{ upserted: string }>(
      `
      WITH partitioned_documents AS (
        SELECT id, "teamId"
        FROM documents
        WHERE "deletedAt" IS NULL
          AND id >= :startUuid::uuid
          AND id <= :endUuid::uuid
      ),
      view_counts AS (
        SELECT
          e."documentId",
          COUNT(*) AS view_count,
          COUNT(DISTINCT e."userId") AS viewer_count
        FROM events e
        INNER JOIN partitioned_documents pd ON pd.id = e."documentId"
        WHERE e.name = 'views.create'
          AND e."createdAt" >= :dayStart::timestamp AT TIME ZONE 'UTC'
          AND e."createdAt" < (:dayStart::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC'
        GROUP BY e."documentId"
      ),
      comment_counts AS (
        SELECT c."documentId", COUNT(*) AS comment_count
        FROM comments c
        INNER JOIN partitioned_documents pd ON pd.id = c."documentId"
        WHERE c."createdAt" >= :dayStart::timestamp AT TIME ZONE 'UTC'
          AND c."createdAt" < (:dayStart::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC'
        GROUP BY c."documentId"
      ),
      reaction_counts AS (
        SELECT c."documentId", COUNT(rx.id) AS reaction_count
        FROM reactions rx
        INNER JOIN comments c ON c.id = rx."commentId"
        INNER JOIN partitioned_documents pd ON pd.id = c."documentId"
        WHERE rx."createdAt" >= :dayStart::timestamp AT TIME ZONE 'UTC'
          AND rx."createdAt" < (:dayStart::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC'
        GROUP BY c."documentId"
      ),
      revision_counts AS (
        SELECT
          r."documentId",
          COUNT(*) AS revision_count,
          COUNT(DISTINCT r."userId") AS editor_count
        FROM revisions r
        INNER JOIN partitioned_documents pd ON pd.id = r."documentId"
        WHERE r."createdAt" >= :dayStart::timestamp AT TIME ZONE 'UTC'
          AND r."createdAt" < (:dayStart::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC'
        GROUP BY r."documentId"
      ),
      active AS (
        SELECT "documentId" FROM view_counts
        UNION SELECT "documentId" FROM comment_counts
        UNION SELECT "documentId" FROM reaction_counts
        UNION SELECT "documentId" FROM revision_counts
      ),
      inserted AS (
        INSERT INTO document_insights (
          id, "documentId", "teamId", date,
          "viewCount", "viewerCount",
          "commentCount", "reactionCount",
          "revisionCount", "editorCount",
          "createdAt", "updatedAt"
        )
        SELECT
          uuid_generate_v4(),
          pd.id,
          pd."teamId",
          :dayStart::date,
          COALESCE(v.view_count, 0),
          COALESCE(v.viewer_count, 0),
          COALESCE(c.comment_count, 0),
          COALESCE(rx.reaction_count, 0),
          COALESCE(r.revision_count, 0),
          COALESCE(r.editor_count, 0),
          NOW(), NOW()
        FROM active a
        INNER JOIN partitioned_documents pd ON pd.id = a."documentId"
        LEFT JOIN view_counts v ON v."documentId" = pd.id
        LEFT JOIN comment_counts c ON c."documentId" = pd.id
        LEFT JOIN reaction_counts rx ON rx."documentId" = pd.id
        LEFT JOIN revision_counts r ON r."documentId" = pd.id
        ON CONFLICT ("documentId", date) DO UPDATE SET
          "viewCount" = EXCLUDED."viewCount",
          "viewerCount" = EXCLUDED."viewerCount",
          "commentCount" = EXCLUDED."commentCount",
          "reactionCount" = EXCLUDED."reactionCount",
          "revisionCount" = EXCLUDED."revisionCount",
          "editorCount" = EXCLUDED."editorCount",
          "updatedAt" = NOW()
        RETURNING 1
      )
      SELECT COUNT(*)::text AS upserted FROM inserted
      `,
      {
        replacements: { dayStart: date, startUuid, endUuid },
        type: QueryTypes.SELECT,
      }
    );

    Logger.info("task", `Rolled up document insights for ${date}`, {
      upserted: parseInt(upserted, 10),
    });
  }

  public get cron() {
    return {
      interval: TaskInterval.Day,
      partitionWindow: 30 * Minute.ms,
    };
  }

  public get options() {
    return {
      attempts: 1,
      priority: TaskPriority.Background,
    };
  }
}
