import { Day, Minute } from "@shared/utils/time";
import Logger from "@server/logging/Logger";
import { Document, Event } from "@server/models";
import { TaskPriority } from "./base/BaseTask";
import type { Props } from "./base/CronTask";
import { CronTask, TaskInterval } from "./base/CronTask";

/**
 * Number of recent days to (re)scan on each run. Overlapping the previous
 * run's window lets documents whose expiry was missed (worker downtime,
 * skipped runs) still be picked up. Emission is idempotent per deadline.
 */
const RESCAN_DAYS = 2;

/**
 * Finds documents whose verification deadline passed recently and emits a
 * "documents.verification_expired" event for each. The task never mutates
 * document rows – expiry is derived state, computed from the stored
 * verificationExpiresAt deadline.
 */
export default class VerificationExpirySweepTask extends CronTask {
  public async perform({ partition }: Props) {
    const [startUuid, endUuid] = this.getPartitionBounds(partition);

    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - RESCAN_DAYS * Day.ms);

    const documents = await Document.findExpiredVerifications({
      windowStart,
      windowEnd,
      startUuid,
      endUuid,
    });

    let emitted = 0;

    for (const document of documents) {
      if (!document.verificationExpiresAt) {
        continue;
      }
      const expiresAt = document.verificationExpiresAt.toISOString();

      // idempotency: re-verification produces a new deadline, so a latest
      // event with a matching deadline means this expiry was already handled.
      const existing = await Event.findLatest({
        name: "documents.verification_expired",
        documentId: document.id,
      });
      if (existing?.data?.expiresAt === expiresAt) {
        continue;
      }

      await Event.create({
        name: "documents.verification_expired",
        documentId: document.id,
        collectionId: document.collectionId,
        teamId: document.teamId,
        data: { expiresAt },
      });
      emitted++;
    }

    Logger.info("task", `Verification expiry sweep complete`, {
      scanned: documents.length,
      emitted,
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
