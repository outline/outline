import crypto from "crypto";
import { subWeeks } from "date-fns";
import { QueryTypes } from "sequelize";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import BaseTask, { TaskSchedule } from "./BaseTask";
import { sequelize, sequelizeReadOnly } from "@server/storage/database";
import { sleep } from "@server/utils/timers";

type Props = Record<string, never>;

/**
 * Number of hours to add to age to smooth the decay curve,
 * preventing brand new content from having disproportionately
 * high scores compared to content just a few hours old.
 */
const TIME_OFFSET_HOURS = 2;

/**
 * Weight multipliers for different activity types relative to base score
 */
const ACTIVITY_WEIGHTS = {
  revision: 1.0,
  comment: 1.2,
  view: 0.5,
};

/**
 * Batch size for processing updates - kept small to minimize lock duration
 */
const BATCH_SIZE = 50;

/**
 * Maximum retries for failed batch operations
 */
const MAX_RETRIES = 2;

/**
 * Statement timeout for individual queries to prevent runaway locks
 */
const STATEMENT_TIMEOUT_MS = 30000;

/**
 * Base name for the working table used to track documents to process
 */
const WORKING_TABLE_PREFIX = "popularity_score_working";

interface DocumentScore {
  documentId: string;
  score: number;
}

export default class UpdateDocumentsPopularityScoreTask extends BaseTask<Props> {
  /**
   * Unique table name for this task run to prevent conflicts with concurrent runs
   */
  private workingTable: string = "";
  static cron = TaskSchedule.Hour;

  public async perform() {
    Logger.info("task", "Updating document popularity scores…");

    // Only run every 6 hours (at hours 0, 6, 12, 18)
    const currentHour = new Date().getHours();
    if (currentHour % 6 !== 0) {
      Logger.debug(
        "task",
        `Skipping popularity score update, will run at next 6-hour interval (current hour: ${currentHour})`
      );
      return;
    }

    const now = new Date();
    const threshold = subWeeks(now, env.POPULARITY_ACTIVITY_THRESHOLD_WEEKS);

    // Generate unique table name for this run to prevent conflicts
    const uniqueId = crypto.randomBytes(8).toString("hex");
    this.workingTable = `${WORKING_TABLE_PREFIX}_${uniqueId}`;

    try {
      // Setup: Create working table and populate with active document IDs
      await this.setupWorkingTable(threshold);

      const activeCount = await this.getWorkingTableCount();

      if (activeCount === 0) {
        Logger.info("task", "No documents with recent activity found");
        return;
      }

      Logger.info(
        "task",
        `Found ${activeCount} documents with recent activity`
      );

      // Process documents in independent batches
      let totalUpdated = 0;
      let totalErrors = 0;
      let batchNumber = 0;

      while (true) {
        const remaining = await this.getWorkingTableCount();
        if (remaining === 0) {
          break;
        }

        batchNumber++;

        try {
          const updated = await this.processBatchWithRetry(threshold, now);
          totalUpdated += updated;

          Logger.debug(
            "task",
            `Batch ${batchNumber}: updated ${updated} documents, ${remaining - updated} remaining`
          );

          // Add delay between batches to reduce database contention
          await sleep(10);
        } catch (error) {
          totalErrors++;
          Logger.error(`Batch ${batchNumber} failed after retries`, error);

          // Remove failed batch from working table to prevent infinite loop
          await this.skipCurrentBatch();
        }
      }

      Logger.info(
        "task",
        `Completed updating popularity scores: ${totalUpdated} documents updated, ${totalErrors} batch errors`
      );
    } catch (error) {
      Logger.error("Failed to update document popularity scores", error);
      throw error;
    } finally {
      // Always clean up the working table
      await this.cleanupWorkingTable();
    }
  }

  /**
   * Creates an unlogged working table and populates it with document IDs
   * that have recent activity. Unlogged tables are faster because they
   * skip WAL logging, and data loss on crash is acceptable here.
   */
  private async setupWorkingTable(threshold: Date): Promise<void> {
    // Drop any existing table first to avoid type conflicts from previous crashed runs
    await sequelize.query(`DROP TABLE IF EXISTS ${this.workingTable} CASCADE`);

    // Create unlogged table - faster than regular tables as it skips WAL logging
    await sequelize.query(`
      CREATE UNLOGGED TABLE ${this.workingTable} (
        "documentId" UUID PRIMARY KEY,
        processed BOOLEAN DEFAULT FALSE
      )
    `);

    // Populate with documents that have recent activity and are valid
    // (published, not deleted). Using JOINs to filter upfront.
    await sequelize.query(
      `
      INSERT INTO ${this.workingTable} ("documentId")
      SELECT DISTINCT d.id
      FROM documents d
      WHERE d."publishedAt" IS NOT NULL
        AND d."deletedAt" IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM revisions r
            WHERE r."documentId" = d.id AND r."createdAt" >= :threshold
          )
          OR EXISTS (
            SELECT 1 FROM comments c
            WHERE c."documentId" = d.id AND c."createdAt" >= :threshold
          )
          OR EXISTS (
            SELECT 1 FROM views v
            WHERE v."documentId" = d.id AND v."updatedAt" >= :threshold
          )
        )
      `,
      { replacements: { threshold } }
    );

    // Create index on processed column for efficient batch selection
    await sequelize.query(`
      CREATE INDEX ON ${this.workingTable} (processed) WHERE NOT processed
    `);
  }

  /**
   * Returns count of unprocessed documents in working table
   */
  private async getWorkingTableCount(): Promise<number> {
    const [result] = await sequelize.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.workingTable} WHERE NOT processed`,
      { type: QueryTypes.SELECT }
    );
    return parseInt(result.count, 10);
  }

  /**
   * Processes a batch of documents with retry logic.
   */
  private async processBatchWithRetry(
    threshold: Date,
    now: Date,
    attempt = 1
  ): Promise<number> {
    try {
      // Step 1: Get batch of document IDs to process
      const batch = await sequelize.query<{ documentId: string }>(
        `
        SELECT "documentId" FROM ${this.workingTable}
        WHERE NOT processed
        ORDER BY "documentId"
        LIMIT :limit
        `,
        {
          replacements: { limit: BATCH_SIZE },
          type: QueryTypes.SELECT,
        }
      );

      if (batch.length === 0) {
        return 0;
      }

      const documentIds = batch.map((b) => b.documentId);

      // Step 2: Calculate scores outside of a transaction
      const scores = await this.calculateScoresForDocuments(
        documentIds,
        threshold,
        now
      );

      // Step 3: Update document scores
      await this.updateDocumentScores(scores);

      // Step 4: Mark batch as processed
      await this.markBatchProcessed(documentIds);

      return documentIds.length;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        Logger.warn(
          `Batch update failed, retrying (attempt ${attempt + 1}/${MAX_RETRIES})`,
          { error }
        );
        await sleep(1000 * attempt);
        return this.processBatchWithRetry(threshold, now, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Calculates popularity scores for a set of documents.
   * This is a read-only operation that doesn't require locks.
   */
  private async calculateScoresForDocuments(
    documentIds: string[],
    threshold: Date,
    now: Date
  ): Promise<DocumentScore[]> {
    const results = await sequelizeReadOnly.query<{
      documentId: string;
      total_score: string;
    }>(
      `
      SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms';

      WITH batch_docs AS (
        SELECT unnest(ARRAY[:documentIds]::uuid[]) AS id
      ),
      revision_scores AS (
        SELECT
          r."documentId",
          SUM(:revisionWeight / POWER(
            GREATEST(EXTRACT(EPOCH FROM (:now::timestamp - r."createdAt")) / 3600 + :timeOffset, 0.1),
            :gravity
          )) as score
        FROM revisions r
        INNER JOIN batch_docs bd ON r."documentId" = bd.id
        WHERE r."createdAt" >= :threshold
        GROUP BY r."documentId"
      ),
      comment_scores AS (
        SELECT
          c."documentId",
          SUM(:commentWeight / POWER(
            GREATEST(EXTRACT(EPOCH FROM (:now::timestamp - c."createdAt")) / 3600 + :timeOffset, 0.1),
            :gravity
          )) as score
        FROM comments c
        INNER JOIN batch_docs bd ON c."documentId" = bd.id
        WHERE c."createdAt" >= :threshold
        GROUP BY c."documentId"
      ),
      view_scores AS (
        SELECT
          v."documentId",
          SUM(:viewWeight / POWER(
            GREATEST(EXTRACT(EPOCH FROM (:now::timestamp - v."updatedAt")) / 3600 + :timeOffset, 0.1),
            :gravity
          )) as score
        FROM views v
        INNER JOIN batch_docs bd ON v."documentId" = bd.id
        WHERE v."updatedAt" >= :threshold
        GROUP BY v."documentId"
      )
      SELECT
        bd.id as "documentId",
        COALESCE(rs.score, 0) + COALESCE(cs.score, 0) + COALESCE(vs.score, 0) as total_score
      FROM batch_docs bd
      LEFT JOIN revision_scores rs ON bd.id = rs."documentId"
      LEFT JOIN comment_scores cs ON bd.id = cs."documentId"
      LEFT JOIN view_scores vs ON bd.id = vs."documentId"
      `,
      {
        replacements: {
          documentIds,
          threshold,
          now,
          gravity: env.POPULARITY_GRAVITY,
          timeOffset: TIME_OFFSET_HOURS,
          revisionWeight: ACTIVITY_WEIGHTS.revision,
          commentWeight: ACTIVITY_WEIGHTS.comment,
          viewWeight: ACTIVITY_WEIGHTS.view,
        },
        type: QueryTypes.SELECT,
      }
    );

    return results.map((r) => ({
      documentId: r.documentId,
      score: parseFloat(r.total_score) || 0,
    }));
  }

  /**
   * Updates document scores in a minimal transaction.
   * Uses individual updates to minimize lock duration and contention.
   */
  private async updateDocumentScores(scores: DocumentScore[]): Promise<void> {
    // Update documents one at a time with short statement timeout
    // This prevents any single update from holding locks for too long
    for (const { documentId, score } of scores) {
      await sequelize.query(
        `
        UPDATE documents
        SET "popularityScore" = :score
        WHERE id = :documentId
        `,
        {
          replacements: { documentId, score },
        }
      );
    }
  }

  /**
   * Marks documents as processed in the working table
   */
  private async markBatchProcessed(documentIds: string[]): Promise<void> {
    await sequelize.query(
      `
      UPDATE ${this.workingTable}
      SET processed = TRUE
      WHERE "documentId" IN (SELECT unnest(ARRAY[:documentIds]::uuid[]))
      `,
      {
        replacements: { documentIds },
      }
    );
  }

  /**
   * Marks current batch as processed without updating scores.
   * Used when a batch fails repeatedly to prevent infinite loops.
   */
  private async skipCurrentBatch(): Promise<void> {
    await sequelize.query(
      `
      UPDATE ${this.workingTable}
      SET processed = TRUE
      WHERE "documentId" IN (
        SELECT "documentId" FROM ${this.workingTable}
        WHERE NOT processed
        ORDER BY "documentId"
        LIMIT :limit
      )
      `,
      { replacements: { limit: BATCH_SIZE } }
    );
  }

  /**
   * Removes the working table
   */
  private async cleanupWorkingTable(): Promise<void> {
    try {
      await sequelize.query(
        `DROP TABLE IF EXISTS ${this.workingTable} CASCADE`
      );
    } catch (error) {
      Logger.warn("Failed to clean up working table", { error });
    }
  }
}
