import crypto from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { subWeeks } from "date-fns";
import { QueryTypes } from "sequelize";
import { Minute } from "@shared/utils/time";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { TaskPriority } from "./base/BaseTask";
import type { PartitionInfo, Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";
import { sequelize, sequelizeReadOnly } from "@server/storage/database";

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
 * Batch size for processing updates - kept small to minimize lock contention
 */
const BATCH_SIZE = 100;

/**
 * Delay between batches in milliseconds to reduce sustained database pressure
 */
const INTER_BATCH_DELAY_MS = 500;

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

export default class UpdateDocumentsPopularityScoreTask extends CronTask {
  /**
   * Unique table name for this task run to prevent conflicts with concurrent runs
   */
  private workingTable: string = "";

  public async perform({ partition }: Props) {
    // Only run every X hours, skip other hours
    const currentHour = new Date().getHours();
    if (currentHour % env.POPULARITY_UPDATE_INTERVAL_HOURS !== 0) {
      Logger.debug(
        "task",
        `Skipping popularity score update, will run at next ${env.POPULARITY_UPDATE_INTERVAL_HOURS}-hour interval (current hour: ${currentHour})`
      );
      return;
    }

    const now = new Date();
    const threshold = subWeeks(now, env.POPULARITY_ACTIVITY_THRESHOLD_WEEKS);

    // Generate unique table name for this run to prevent conflicts
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, "");
    const uniqueId = crypto.randomBytes(4).toString("hex");
    this.workingTable = `${WORKING_TABLE_PREFIX}_${dateStr}_${uniqueId}`;

    try {
      // Setup: Create working table and populate with active document IDs
      await this.setupWorkingTable(threshold, partition);

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
          const updated = await this.processBatch(threshold, now);
          totalUpdated += updated;

          Logger.debug(
            "task",
            `Batch ${batchNumber}: updated ${updated} documents, ${remaining - updated} remaining`
          );

          // Add delay between batches to reduce sustained pressure on the database
          if (remaining - updated > 0) {
            await setTimeout(INTER_BATCH_DELAY_MS);
          }
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
  private async setupWorkingTable(
    threshold: Date,
    partition: PartitionInfo
  ): Promise<void> {
    // Drop any existing table first to avoid type conflicts from previous crashed runs
    await sequelize.query(`DROP TABLE IF EXISTS ${this.workingTable} CASCADE`);

    // Create unlogged table - faster than regular tables as it skips WAL logging
    await sequelize.query(`
      CREATE UNLOGGED TABLE ${this.workingTable} (
        "documentId" UUID PRIMARY KEY,
        processed BOOLEAN DEFAULT FALSE
      )
    `);

    const [startUuid, endUuid] = this.getPartitionBounds(partition);

    // Populate with documents that have recent activity and are valid
    // (published, not deleted). Process in chunks to avoid long-running queries.
    // Read from replica to avoid excessive locking on primary.
    let lastId = startUuid;
    let insertedCount = 0;
    const chunkSize = 1000;

    while (true) {
      // Step 1: Read document IDs from readonly replica to avoid locking
      const documentIds = await sequelizeReadOnly.query<{ id: string }>(
        `
        SELECT d.id
        FROM documents d
        WHERE d."publishedAt" IS NOT NULL
          AND d."deletedAt" IS NULL
          ${lastId ? (insertedCount === 0 ? "AND d.id >= :lastId" : "AND d.id > :lastId") : ""}
          ${endUuid ? "AND d.id <= :endUuid" : ""}
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
        ORDER BY d.id
        LIMIT :limit
        `,
        {
          replacements: {
            threshold,
            lastId,
            endUuid,
            limit: chunkSize,
          },
          type: QueryTypes.SELECT,
        }
      );

      if (documentIds.length === 0) {
        break;
      }

      // Step 2: Insert the IDs into the working table on primary
      const ids = documentIds.map((d) => d.id);
      const result = await sequelize.query<{ documentId: string }>(
        `
        INSERT INTO ${this.workingTable} ("documentId")
        SELECT * FROM unnest(ARRAY[:ids]::uuid[])
        ON CONFLICT ("documentId") DO NOTHING
        RETURNING "documentId"
        `,
        {
          replacements: { ids },
          type: QueryTypes.SELECT,
        }
      );

      insertedCount += result.length;
      lastId = documentIds[documentIds.length - 1].id;

      if (documentIds.length < chunkSize) {
        break;
      }
    }

    Logger.debug(
      "task",
      `Populated working table with ${insertedCount} documents in ${Math.ceil(insertedCount / chunkSize)} chunks`
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
  private async processBatch(threshold: Date, now: Date): Promise<number> {
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
    const results = await sequelizeReadOnly.transaction(async (transaction) => {
      // Set statement timeout within the transaction - this prevents any single
      // query from running too long and holding resources
      await sequelizeReadOnly.query(
        `SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`,
        { transaction }
      );

      return sequelizeReadOnly.query<{
        documentId: string;
        total_score: string;
      }>(
        `
        WITH batch_docs AS (
          SELECT * FROM unnest(ARRAY[:documentIds]::uuid[]) AS t(id)
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
          transaction,
        }
      );
    });

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
    if (scores.length === 0) {
      return;
    }

    // Update documents in a single batch to improve performance and reduce round-trips.
    // We use unnest with multiple arrays to ensure the IDs and scores stay aligned.
    // We also use SKIP LOCKED to avoid waiting on locked rows from other concurrent tasks.
    await sequelize.query(
      `
      WITH lockable AS (
        SELECT id FROM documents WHERE id = ANY(ARRAY[:ids]::uuid[]) FOR UPDATE SKIP LOCKED
      )
      UPDATE documents AS d
      SET "popularityScore" = s.score
      FROM (
        SELECT * FROM unnest(ARRAY[:ids]::uuid[], ARRAY[:scores]::double precision[]) AS s(id, score)
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

  /**
   * Marks documents as processed in the working table
   */
  private async markBatchProcessed(documentIds: string[]): Promise<void> {
    await sequelize.query(
      `
      UPDATE ${this.workingTable}
      SET processed = TRUE
      WHERE "documentId" = ANY(ARRAY[:documentIds]::uuid[])
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

  public get cron() {
    return {
      interval: TaskInterval.Hour,
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
