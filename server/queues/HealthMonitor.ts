import { Queue } from "bull";
import { Second } from "@shared/utils/time";
import Logger from "@server/logging/Logger";

/* eslint-disable @typescript-eslint/no-misused-promises */
export default class HealthMonitor {
  /**
   * Starts a health monitor for the given queue. If the queue stops processing jobs then the
   * process is exit.
   *
   * @param queue The queue to monitor
   */
  public static start(queue: Queue) {
    let processedJobsSinceCheck = 0;

    queue.on("active", () => {
      processedJobsSinceCheck += 1;
    });

    setInterval(async () => {
      if (processedJobsSinceCheck > 0) {
        processedJobsSinceCheck = 0;
        return;
      }

      processedJobsSinceCheck = 0;
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
    }, 30 * Second.ms);
  }
}
