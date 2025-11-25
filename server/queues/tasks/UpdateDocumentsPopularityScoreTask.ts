import { subWeeks } from "date-fns";
import { Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { Document, Revision } from "@server/models";
import BaseTask, { TaskSchedule } from "./BaseTask";

type Props = Record<string, never>;

/**
 * Gravity constant for time decay (Hacker News uses 1.8)
 * Higher values cause faster decay of older content
 */
const GRAVITY = 1.8;

/**
 * Number of hours to add to age to prevent division issues
 * and give new content a slight boost
 */
const TIME_OFFSET_HOURS = 2;

/**
 * Only recalculate scores for documents updated within this period,
 * and how far back to look for revisions when calculating scores
 */
const ACTIVITY_THRESHOLD_WEEKS = 2;

/**
 * Batch size for processing documents
 */
const BATCH_SIZE = 100;

/**
 * Calculates a time-decayed score contribution for a single revision
 * using the Hacker News algorithm: 1 / (hours + offset)^gravity
 *
 * @param revisionDate The date of the revision
 * @param now The current timestamp
 * @returns The score contribution for this revision
 */
function calculateRevisionScore(revisionDate: Date, now: Date): number {
  const ageInHours =
    (now.getTime() - revisionDate.getTime()) / (1000 * 60 * 60);
  return 1 / Math.pow(ageInHours + TIME_OFFSET_HOURS, GRAVITY);
}

export default class UpdateDocumentsPopularityScoreTask extends BaseTask<Props> {
  static cron = TaskSchedule.Day;

  public async perform() {
    Logger.info("task", "Updating document popularity scores…");

    const now = new Date();
    const activityThreshold = subWeeks(now, ACTIVITY_THRESHOLD_WEEKS);

    const updatedCount = await Document.findAllInBatches<Document>(
      {
        attributes: ["id"],
        where: {
          publishedAt: {
            [Op.ne]: null,
          },
          deletedAt: {
            [Op.is]: null,
          },
          updatedAt: {
            [Op.gte]: activityThreshold,
          },
        },
        batchLimit: BATCH_SIZE,
        order: [["id", "ASC"]],
      },
      async (documents) => {
        const documentIds = documents.map((doc) => doc.id);

        // Fetch all revisions for this batch of documents within the activity period
        const revisions = await Revision.unscoped().findAll({
          attributes: ["documentId", "createdAt"],
          where: {
            documentId: {
              [Op.in]: documentIds,
            },
            createdAt: {
              [Op.gte]: activityThreshold,
            },
          },
          order: [["documentId", "ASC"]],
        });

        // Group revisions by document and calculate scores
        const scoresByDocument = new Map<string, number>();

        // Initialize all documents with 0 score
        for (const docId of documentIds) {
          scoresByDocument.set(docId, 0);
        }

        // Sum up revision contributions for each document
        for (const revision of revisions) {
          const currentScore = scoresByDocument.get(revision.documentId) || 0;
          const revisionScore = calculateRevisionScore(revision.createdAt, now);
          scoresByDocument.set(
            revision.documentId,
            currentScore + revisionScore
          );
        }

        // Batch update documents with their new scores
        for (const [documentId, score] of scoresByDocument) {
          await Document.unscoped().update(
            { popularityScore: score },
            {
              where: { id: documentId },
              silent: true, // Don't update updatedAt
            }
          );
        }

        Logger.debug(
          "task",
          `Updated popularity scores for ${documents.length} documents…`
        );
      }
    );

    Logger.info(
      "task",
      `Completed updating popularity scores for ${updatedCount} documents`
    );
  }
}
