import crypto from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { subDays } from "date-fns";
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
  reaction: 0.8,
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
    // Use UTC day boundaries to match how document_insights.date is written by
    // RollupDocumentInsightsTask (which derives dates via toISOString). Local
    // timezone could shift the window by a day in some deployments.
    const today = now.toISOString().slice(0, 10);
    const thresholdDate = subDays(
      now,
      env.POPULARITY_ACTIVITY_THRESHOLD_WEEKS * 7
    )
      .toISOString()
      .slice(0, 10);

    // Generate unique table name for this run to prevent conflicts
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, "");
    const uniqueId = crypto.randomBytes(4).toString("hex");
    this.workingTable = `${WORKING_TABLE_PREFIX}_${dateStr}_${uniqueId}`;

    try {
      // Clean up any stale working tables left behind by previous crashed runs
      await this.cleanupStaleWorkingTables();

      // Setup: Create working table and populate with active document IDs
      await this.setupWorkingTable(thresholdDate, today, partition);

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
          const updated = await this.processBatch(thresholdDate, today);
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
    thresholdDate: string,
    today: string,
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

    // Populate with documents that have recent activity OR a current non-zero
    // score (so dormant docs decay back to zero once activity falls out of the
    // window). Must be valid: published and not deleted. Process in chunks to
    // avoid long-running queries. Read from replica to avoid excessive locking.
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
            d."popularityScore" > 0
            OR EXISTS (
              SELECT 1 FROM document_insights di
              WHERE di."documentId" = d.id
                AND di.date >= :thresholdDate::date
                AND di.date <= :today::date
            )
          )
        ORDER BY d.id
        LIMIT :limit
        `,
        {
          replacements: {
            thresholdDate,
            today,
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
  private async processBatch(
    thresholdDate: string,
    today: string
  ): Promise<number> {
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
      thresholdDate,
      today
    );

    // Step 3: Update document scores
    await this.updateDocumentScores(scores);

    // Step 4: Mark batch as processed
    await this.markBatchProcessed(documentIds);

    return documentIds.length;
  }

  /**
   * Calculates popularity scores for a set of documents by summing weighted,
   * time-decayed daily activity counts from the document_insights rollup.
   * This is a read-only operation that doesn't require locks.
   */
  private async calculateScoresForDocuments(
    documentIds: string[],
    thresholdDate: string,
    today: string
  ): Promise<DocumentScore[]> {
    const results = await sequelizeReadOnly.query<{
      documentId: string;
      total_score: string;
    }>(
      `
      WITH batch_docs AS (
        SELECT * FROM unnest(ARRAY[:documentIds]::uuid[]) AS t(id)
      )
      SELECT
        bd.id AS "documentId",
        COALESCE(SUM(
          (di."revisionCount" * :revisionWeight
            + di."commentCount" * :commentWeight
            + di."reactionCount" * :reactionWeight
            + di."viewCount" * :viewWeight)
          / POWER(
            GREATEST(
              (:today::date - di.date) * 24 + :timeOffset,
              0.1
            ),
            :gravity
          )
        ), 0) AS total_score
      FROM batch_docs bd
      LEFT JOIN document_insights di
        ON di."documentId" = bd.id
        AND di.date >= :thresholdDate::date
        AND di.date <= :today::date
      GROUP BY bd.id
      `,
      {
        replacements: {
          documentIds,
          thresholdDate,
          today,
          gravity: env.POPULARITY_GRAVITY,
          timeOffset: TIME_OFFSET_HOURS,
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
   * Drops any stale working tables from previous dates that were left behind
   * by runs interrupted before cleanup could occur (e.g. worker killed mid-run).
   * Only removes tables from before the current date to avoid race conditions
   * with concurrent runs.
   */
  private async cleanupStaleWorkingTables(): Promise<void> {
    try {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const tables = await sequelize.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public'
           AND tablename LIKE :prefix`,
        {
          replacements: {
            prefix: `${WORKING_TABLE_PREFIX}%`,
          },
          type: QueryTypes.SELECT,
        }
      );

      const prefixLen = WORKING_TABLE_PREFIX.length + 1; // +1 for underscore

      for (const { tablename } of tables) {
        const dateStr = tablename.slice(prefixLen, prefixLen + 8);
        if (dateStr < todayStr) {
          Logger.info("task", `Dropping stale working table: ${tablename}`);
          await sequelize.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
        }
      }
    } catch (error) {
      Logger.warn("Failed to clean up stale working tables", { error });
    }
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
