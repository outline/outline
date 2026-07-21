import type { Queue } from "bull";
import { Second } from "@shared/utils/time";
import Logger from "@server/logging/Logger";

/* oxlint-disable @typescript-eslint/no-misused-promises */
export default class HealthMonitor {
  /**
   * Starts a health monitor for the given queue. If the queue stops processing jobs then the
   * process is exit.
   *
   * @param queue The queue to monitor
   */
  public static start(queue: Queue) {
    let lastActivityTime = Date.now();

    queue.on("active", () => {
      lastActivityTime = Date.now();
    });
    queue.on("completed", () => {
      lastActivityTime = Date.now();
    });
    queue.on("failed", () => {
      lastActivityTime = Date.now();
    });

    const timer = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivityTime;

      // If there's been recent activity, the queue is healthy
      if (timeSinceActivity < 30 * Second.ms) {
        return;
      }

      try {
        const waiting = await queue.getWaitingCount();
        if (waiting > 50) {
          Logger.fatal(
            "Queue has stopped processing jobs",
            new Error(`Jobs are waiting in the ${queue.name} queue`),
            {
              queue: queue.name,
              waiting,
            }
          );
        }
      } catch (err) {
        // A transient error querying the queue (eg Redis blip or a queue closing
        // during shutdown) should not take down the process it is meant to guard.
        Logger.warn("Failed to check queue health", {
          queue: queue.name,
          error: err,
        });
      }
    }, 30 * Second.ms);

    timer.unref();
  }
}
