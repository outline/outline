import "./bootstrap";
import { QueryTypes } from "sequelize";
import { Day } from "@shared/utils/time";
import { sequelize } from "@server/storage/database";

const DEFAULT_DAYS = 14;

const days = parseInt(process.argv[2], 10);
const backfillDays = Number.isNaN(days) ? DEFAULT_DAYS : days;

/**
 * Populates document_insights with one row per (document, day) for each day
 * within the backfill window that has source activity. Safe to re-run — the
 * upsert keys on (documentId, date). Source ranges are half-open
 * [dayStart, dayStart + 1) in UTC so events land in exactly one day.
 */
async function backfillDay(date: string): Promise<number> {
  const [{ upserted }] = await sequelize.query<{ upserted: string }>(
    `
    WITH view_counts AS (
      SELECT
        "documentId",
        COUNT(*) AS view_count,
        COUNT(DISTINCT "userId") AS viewer_count
      FROM events
      WHERE name = 'views.create'
        AND "createdAt" >= :dayStart::timestamp AT TIME ZONE 'UTC'
        AND "createdAt" < (:dayStart::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC'
      GROUP BY "documentId"
    ),
    comment_counts AS (
      SELECT "documentId", COUNT(*) AS comment_count
      FROM comments
      WHERE "createdAt" >= :dayStart::timestamp AT TIME ZONE 'UTC'
        AND "createdAt" < (:dayStart::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC'
      GROUP BY "documentId"
    ),
    reaction_counts AS (
      SELECT c."documentId", COUNT(rx.id) AS reaction_count
      FROM reactions rx
      INNER JOIN comments c ON c.id = rx."commentId"
      WHERE rx."createdAt" >= :dayStart::timestamp AT TIME ZONE 'UTC'
        AND rx."createdAt" < (:dayStart::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC'
      GROUP BY c."documentId"
    ),
    revision_counts AS (
      SELECT
        "documentId",
        COUNT(*) AS revision_count,
        COUNT(DISTINCT "userId") AS editor_count
      FROM revisions
      WHERE "createdAt" >= :dayStart::timestamp AT TIME ZONE 'UTC'
        AND "createdAt" < (:dayStart::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC'
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
      replacements: { dayStart: date },
      type: QueryTypes.SELECT,
    }
  );

  return parseInt(upserted, 10);
}

async function main() {
  console.log(`Backfilling ${backfillDays} days of document insights…`);

  for (let offset = backfillDays; offset >= 1; offset--) {
    const date = new Date(Date.now() - offset * Day.ms)
      .toISOString()
      .slice(0, 10);
    const upserted = await backfillDay(date);
    console.log(`  ${date}: ${upserted} rows`);
  }

  console.log("Backfill complete");
  process.exit(0);
}

if (process.env.NODE_ENV !== "test") {
  void main();
}

export default main;
