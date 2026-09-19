import type { Queue } from "bull";
import { toError } from "@shared/utils/error";
import { Second } from "@shared/utils/time";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";

interface UnhealthyResult {
  /** A description of the failure. */
  message: string;
  /** The error to report. */
  error: Error;
  /** Additional context to log alongside the error. */
  extra: Record<string, string | number>;
}

/* oxlint-disable @typescript-eslint/no-misused-promises */
export default class HealthMonitor {
  /** The interval between health checks. */
  public static readonly checkInterval = 30 * Second.ms;

  /** The time without queue activity after which the queue depth is checked. */
  public static readonly activityTimeout = 30 * Second.ms;

  /** The time a single health check has to complete before it is failed. */
  public static readonly checkTimeout = 10 * Second.ms;

  /** The number of waiting jobs an inactive queue may have before it is unhealthy. */
  public static readonly maxWaitingJobs = 50;

  /** The number of consecutive unhealthy checks that end the process. */
  public static readonly maxConsecutiveFailures = 2;

  /** The time graceful shutdown has to complete before the process is exited. */
  public static readonly shutdownTimeout = 5 * Second.ms;

  /**
   * A Redis connection used only by the health monitor. Sharing the queue's connection would
   * make the check wait behind the same commands that it is meant to detect.
   */
  public static get client(): Redis {
    return (
      this.healthClient ||
      (this.healthClient = new Redis(env.REDIS_URL, {
        connectionNameSuffix: "health",
      }))
    );
  }

  /**
   * Starts a health monitor for the given queue. If the queue stops processing jobs, or the
   * health check itself cannot complete, then the process is exited so that it is restarted.
   *
   * @param queue The queue to monitor
   */
  public static start(queue: Queue) {
    let lastActivityTime = Date.now();
    let consecutiveFailures = 0;

    const recordActivity = () => {
      lastActivityTime = Date.now();
    };

    queue.on("active", recordActivity);
    queue.on("completed", recordActivity);
    queue.on("failed", recordActivity);

    const timer = setInterval(async () => {
      // If there's been recent activity, the queue is healthy
      if (Date.now() - lastActivityTime < this.activityTimeout) {
        consecutiveFailures = 0;
        return;
      }

      const unhealthy = await this.check(queue);

      if (!unhealthy) {
        consecutiveFailures = 0;
        return;
      }

      consecutiveFailures++;

      // A single bad check can be a blip, such as a brief loss of the Redis connection or a
      // burst of jobs enqueued moments before the check. Wait for a second one before taking
      // down a process that may be healthy.
      if (consecutiveFailures < this.maxConsecutiveFailures) {
        Logger.warn(unhealthy.message, {
          ...unhealthy.extra,
          error: unhealthy.error,
          consecutiveFailures,
        });
        return;
      }

      this.exit(unhealthy);
    }, this.checkInterval);

    timer.unref();
  }

  /**
   * Checks whether the given queue is processing the jobs that are waiting in it.
   *
   * @param queue The queue to check
   * @returns a description of the failure, or undefined if the queue is healthy.
   */
  private static async check(
    queue: Queue
  ): Promise<UnhealthyResult | undefined> {
    let waiting: number;

    try {
      waiting = await this.withTimeout(this.getWaitingCount(queue));
    } catch (err) {
      // The check runs on a connection of its own, so it does not queue behind whatever
      // wedged the queue. A failure here means Redis is unreachable or this process can no
      // longer talk to it, and in both cases a restart is the fastest way back.
      return {
        message: "Queue health check failed",
        error: toError(err),
        extra: { queue: queue.name },
      };
    }

    if (waiting > this.maxWaitingJobs) {
      return {
        message: "Queue has stopped processing jobs",
        error: new Error(`Jobs are waiting in the ${queue.name} queue`),
        extra: { queue: queue.name, waiting },
      };
    }

    return undefined;
  }

  /**
   * Returns the number of jobs waiting in the given queue, matching the keys that Bull's own
   * `getWaitingCount` reads, but over the monitor's connection.
   *
   * @param queue The queue to count waiting jobs for
   * @returns the number of waiting jobs.
   */
  private static async getWaitingCount(queue: Queue) {
    const [waiting, paused] = await Promise.all([
      this.client.llen(queue.toKey("wait")),
      this.client.llen(queue.toKey("paused")),
    ]);

    return waiting + paused;
  }

  /**
   * Rejects if the given promise does not settle within the check timeout.
   *
   * @param promise The promise to bound
   * @returns the resolved value of the promise.
   * @throws if the promise does not settle in time.
   */
  private static withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error("Health check timed out")),
        this.checkTimeout
      );
    });

    return Promise.race([promise, timeout]).finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  }

  /**
   * Reports the given failure and exits the process so that it is restarted.
   *
   * @param unhealthy The failure that was detected
   */
  private static exit({ message, error, extra }: UnhealthyResult) {
    Logger.fatal(message, error, extra);

    // Graceful shutdown closes the queues, which can itself hang when Redis is the problem.
    // Exit shortly after so that a restart is not delayed by the force quit timeout.
    setTimeout(() => process.exit(1), this.shutdownTimeout);
  }

  /** The lazily created connection returned by `client`. */
  private static healthClient: Redis;
}
