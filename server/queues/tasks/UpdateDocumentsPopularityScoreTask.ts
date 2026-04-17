import { subDays, format } from "date-fns";
import { QueryTypes } from "sequelize";
import { Minute } from "@shared/utils/time";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import { sequelize, sequelizeReadOnly } from "@server/storage/database";

/**
 * Smoothing term added to the age (in days) before applying the decay curve,
 * so brand-new activity doesn't dominate scores inside the first day.
 */
const TIME_OFFSET_DAYS = 0.5;

/**
 * Weight multipliers applied to each activity type per rollup row.
 */
const ACTIVITY_WEIGHTS = {
  revision: 1.0,
  comment: 1.2,
  reaction: 1.2,
  view: 0.5,
};

/**
 * Number of documents whose scores are updated in a single UPDATE round-trip.
 */
const BATCH_SIZE = 500;

interface DocumentScore {
  documentId: string;
  score: number;
}

export default class UpdateDocumentsPopularityScoreTask extends CronTask {
  public async perform({ partition }: Props) {
    const [startUuid, endUuid] = this.getPartitionBounds(partition);

    if (!(await this.hasFreshRollup())) {
      Logger.info(
        "task",
        "Skipping popularity update, document_insights rollup is behind"
      );
      return;
    }

    const thresholdDays = env.POPULARITY_ACTIVITY_THRESHOLD_WEEKS * 7;
    const thresholdDate = format(
      subDays(new Date(), thresholdDays),
      "yyyy-MM-dd"
    );

    const scores = await this.calculateScores(
      thresholdDate,
      startUuid,
      endUuid
    );

    if (scores.length === 0) {
      Logger.info("task", "No documents with recent insights to score");
      return;
    }

    let updated = 0;
    for (let i = 0; i < scores.length; i += BATCH_SIZE) {
      const batch = scores.slice(i, i + BATCH_SIZE);
      await this.updateDocumentScores(batch);
      updated += batch.length;
    }

    Logger.info("task", `Updated popularity scores`, {
      documents: updated,
    });
  }

  /**
   * Returns true if there is at least one document_insights row for yesterday
   * or today. Short-circuits the popularity update if the rollup is stale.
   */
  private async hasFreshRollup(): Promise<boolean> {
    const cutoff = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const [row] = await sequelizeReadOnly.query<{ fresh: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1 FROM document_insights WHERE date >= :cutoff::date
      ) AS fresh
      `,
      {
        replacements: { cutoff },
        type: QueryTypes.SELECT,
      }
    );
    return row?.fresh ?? false;
  }

  /**
   * Sum a weighted + time-decayed score across the last N days of rollup rows
   * for each document in the given UUID partition range.
   */
  private async calculateScores(
    thresholdDate: string,
    startUuid: string,
    endUuid: string
  ): Promise<DocumentScore[]> {
    const results = await sequelizeReadOnly.query<{
      documentId: string;
      score: string;
    }>(
      `
      SELECT
        di."documentId" AS "documentId",
        SUM(
          (:revisionWeight * di."revisionCount"
           + :commentWeight  * di."commentCount"
           + :reactionWeight * di."reactionCount"
           + :viewWeight     * di."viewCount")
          / POWER(
              GREATEST(
                (CURRENT_DATE - di.date)::numeric + :timeOffsetDays,
                0.1
              ),
              :gravity
            )
        ) AS score
      FROM document_insights di
      INNER JOIN documents d ON d.id = di."documentId"
      WHERE di.date >= :thresholdDate::date
        AND d."deletedAt" IS NULL
        AND di."documentId" >= :startUuid::uuid
        AND di."documentId" <= :endUuid::uuid
      GROUP BY di."documentId"
      `,
      {
        replacements: {
          thresholdDate,
          startUuid,
          endUuid,
          gravity: env.POPULARITY_GRAVITY,
          timeOffsetDays: TIME_OFFSET_DAYS,
          revisionWeight: ACTIVITY_WEIGHTS.revision,
          commentWeight: ACTIVITY_WEIGHTS.comment,
          reactionWeight: ACTIVITY_WEIGHTS.reaction,
          viewWeight: ACTIVITY_WEIGHTS.view,
        },
        type: QueryTypes.SELECT,
      }
    );

    return results.map((r) => ({
      documentId: r.documentId,
      score: parseFloat(r.score) || 0,
    }));
  }

  /**
   * Write computed scores back to the documents table.
   * FOR UPDATE SKIP LOCKED avoids contention with concurrent document writes.
   */
  private async updateDocumentScores(scores: DocumentScore[]): Promise<void> {
    if (scores.length === 0) {
      return;
    }

    await sequelize.query(
      `
      WITH lockable AS (
        SELECT id FROM documents
        WHERE id = ANY(ARRAY[:ids]::uuid[])
        FOR UPDATE SKIP LOCKED
      )
      UPDATE documents AS d
      SET "popularityScore" = s.score
      FROM (
        SELECT * FROM unnest(
          ARRAY[:ids]::uuid[],
          ARRAY[:scores]::double precision[]
        ) AS s(id, score)
      ) AS s
      WHERE d.id = s.id
      AND d.id IN (SELECT id FROM lockable)
      `,
      {
        replacements: {
          ids: scores.map((s) => s.documentId),
          scores: scores.map((s) => s.score),
        },
      }
    );
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
