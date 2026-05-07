import type { InferAttributes, InferCreationAttributes } from "sequelize";
import { QueryTypes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Document from "./Document";
import Team from "./Team";
import IdModel from "./base/IdModel";
import { SkipChangeset } from "./decorators/Changeset";
import Fix from "./decorators/Fix";

export enum DocumentInsightPeriod {
  Day = "day",
  Week = "week",
}

@Table({
  tableName: "document_insights",
  modelName: "documentInsight",
  indexes: [
    {
      fields: ["documentId", "date", "period"],
      unique: true,
    },
    {
      fields: ["teamId", "date"],
    },
  ],
})
@Fix
class DocumentInsight extends IdModel<
  InferAttributes<DocumentInsight>,
  Partial<InferCreationAttributes<DocumentInsight>>
> {
  @Column(DataType.DATEONLY)
  date: string;

  @Default(DocumentInsightPeriod.Day)
  @Column(DataType.ENUM(...Object.values(DocumentInsightPeriod)))
  @SkipChangeset
  period: DocumentInsightPeriod;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  viewCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  viewerCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  commentCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  reactionCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  revisionCount: number;

  @Default(0)
  @Column(DataType.INTEGER)
  @SkipChangeset
  editorCount: number;

  // associations

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  /**
   * Aggregate a time window of source activity (views, comments, reactions,
   * revisions) into document_insights rows for documents whose id falls in the
   * given UUID range. Upserts on the unique (documentId, date, period) index
   * so the operation is idempotent.
   *
   * @param options.periodStart UTC date string (YYYY-MM-DD) marking the start of the window.
   * @param options.intervalDays length of the window in days (1 for daily, 7 for weekly).
   * @param options.period the period type to write on each row.
   * @param options.startUuid inclusive lower bound of the document id partition.
   * @param options.endUuid inclusive upper bound of the document id partition.
   * @returns the number of rows upserted.
   */
  public static async rollupPeriod({
    periodStart,
    intervalDays,
    period,
    startUuid,
    endUuid,
  }: {
    periodStart: string;
    intervalDays: number;
    period: DocumentInsightPeriod;
    startUuid: string;
    endUuid: string;
  }): Promise<number> {
    const [{ upserted }] = await this.sequelize!.query<{ upserted: string }>(
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
          AND e."createdAt" >= :periodStart::timestamp AT TIME ZONE 'UTC'
          AND e."createdAt" < (:periodStart::timestamp + (:intervalDays * INTERVAL '1 day')) AT TIME ZONE 'UTC'
        GROUP BY e."documentId"
      ),
      comment_counts AS (
        SELECT c."documentId", COUNT(*) AS comment_count
        FROM comments c
        INNER JOIN partitioned_documents pd ON pd.id = c."documentId"
        WHERE c."createdAt" >= :periodStart::timestamp AT TIME ZONE 'UTC'
          AND c."createdAt" < (:periodStart::timestamp + (:intervalDays * INTERVAL '1 day')) AT TIME ZONE 'UTC'
        GROUP BY c."documentId"
      ),
      reaction_counts AS (
        SELECT c."documentId", COUNT(rx.id) AS reaction_count
        FROM reactions rx
        INNER JOIN comments c ON c.id = rx."commentId"
        INNER JOIN partitioned_documents pd ON pd.id = c."documentId"
        WHERE rx."createdAt" >= :periodStart::timestamp AT TIME ZONE 'UTC'
          AND rx."createdAt" < (:periodStart::timestamp + (:intervalDays * INTERVAL '1 day')) AT TIME ZONE 'UTC'
        GROUP BY c."documentId"
      ),
      revision_counts AS (
        SELECT
          r."documentId",
          COUNT(*) AS revision_count,
          COUNT(DISTINCT r."userId") AS editor_count
        FROM revisions r
        INNER JOIN partitioned_documents pd ON pd.id = r."documentId"
        WHERE r."createdAt" >= :periodStart::timestamp AT TIME ZONE 'UTC'
          AND r."createdAt" < (:periodStart::timestamp + (:intervalDays * INTERVAL '1 day')) AT TIME ZONE 'UTC'
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
          id, "documentId", "teamId", date, period,
          "viewCount", "viewerCount",
          "commentCount", "reactionCount",
          "revisionCount", "editorCount",
          "createdAt", "updatedAt"
        )
        SELECT
          uuid_generate_v4(),
          pd.id,
          pd."teamId",
          :periodStart::date,
          :period,
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
        ON CONFLICT ("documentId", date, period) DO UPDATE SET
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
        replacements: {
          periodStart,
          intervalDays,
          period,
          startUuid,
          endUuid,
        },
        type: QueryTypes.SELECT,
      }
    );

    return parseInt(upserted, 10);
  }
}

export default DocumentInsight;
