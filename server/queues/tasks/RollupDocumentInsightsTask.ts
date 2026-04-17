import { subDays, format } from "date-fns";
import { QueryTypes } from "sequelize";
import { Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { sequelize } from "@server/storage/database";
import UpdateDocumentsPopularityScoreTask from "./UpdateDocumentsPopularityScoreTask";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Number of recent days to (re)compute on each run. Reprocessing the two
 * most recent days lets late-arriving writes (slow workers, out-of-order
 * event emission) settle into the rollup. The upsert is idempotent.
 */
const RECOMPUTE_DAYS = 2;

export default class RollupDocumentInsightsTask extends CronTask {
  public async perform({ partition }: Props) {
    const [startUuid, endUuid] = this.getPartitionBounds(partition);

    for (let offset = RECOMPUTE_DAYS; offset >= 1; offset--) {
      const date = format(subDays(new Date(), offset), "yyyy-MM-dd");
      await this.rollupDay(date, startUuid, endUuid);
    }

    // Kick off popularity recompute now that fresh rollup data is in place.
    await new UpdateDocumentsPopularityScoreTask().schedule({
      limit: 10000,
      partition,
    });
  }

  private async rollupDay(
    date: string,
    startUuid: string,
    endUuid: string
  ): Promise<void> {
    const [{ upserted }] = await sequelize.query<{ upserted: string }>(
      `
      WITH view_counts AS (
        SELECT
          "documentId",
          COUNT(*) AS view_count,
          COUNT(DISTINCT "userId") AS viewer_count
        FROM events
        WHERE name = 'views.create'
          AND "createdAt" >= :dayStart::date
          AND "createdAt" < (:dayStart::date + INTERVAL '1 day')
        GROUP BY "documentId"
      ),
      comment_counts AS (
        SELECT "documentId", COUNT(*) AS comment_count
        FROM comments
        WHERE "createdAt" >= :dayStart::date
          AND "createdAt" < (:dayStart::date + INTERVAL '1 day')
        GROUP BY "documentId"
      ),
      reaction_counts AS (
        SELECT c."documentId", COUNT(rx.id) AS reaction_count
        FROM reactions rx
        INNER JOIN comments c ON c.id = rx."commentId"
        WHERE rx."createdAt" >= :dayStart::date
          AND rx."createdAt" < (:dayStart::date + INTERVAL '1 day')
        GROUP BY c."documentId"
      ),
      revision_counts AS (
        SELECT
          "documentId",
          COUNT(*) AS revision_count,
          COUNT(DISTINCT "userId") AS editor_count
        FROM revisions
        WHERE "createdAt" >= :dayStart::date
          AND "createdAt" < (:dayStart::date + INTERVAL '1 day')
        GROUP BY "documentId"
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
          d.id,
          d."teamId",
          :dayStart::date,
          COALESCE(v.view_count, 0),
          COALESCE(v.viewer_count, 0),
          COALESCE(c.comment_count, 0),
          COALESCE(rx.reaction_count, 0),
          COALESCE(r.revision_count, 0),
          COALESCE(r.editor_count, 0),
          NOW(), NOW()
        FROM active a
        INNER JOIN documents d ON d.id = a."documentId"
        LEFT JOIN view_counts v ON v."documentId" = d.id
        LEFT JOIN comment_counts c ON c."documentId" = d.id
        LEFT JOIN reaction_counts rx ON rx."documentId" = d.id
        LEFT JOIN revision_counts r ON r."documentId" = d.id
        WHERE d."deletedAt" IS NULL
          AND d.id >= :startUuid::uuid
          AND d.id <= :endUuid::uuid
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
