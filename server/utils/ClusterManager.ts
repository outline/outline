import cluster, { type Worker } from "node:cluster";
import os from "node:os";
import { Second } from "@shared/utils/time";
import { ShutdownHelper } from "./ShutdownHelper";

interface ClusterOptions {
  /** Called once in the primary process before any worker is forked. */
  primary?: () => Promise<void> | void;
  /** Called in each forked worker process with its id and a disconnect callback. */
  worker: (id: number, disconnect: () => void) => Promise<void> | void;
  /** The number of workers to fork, defaults to one per CPU. */
  count?: number;
}

/**
 * Supervises a cluster of forked worker processes. The primary process forks
 * the workers, replaces any that exit unexpectedly, and forwards termination
 * signals to them.
 */
export class ClusterManager {
  /**
   * The amount of time to wait for workers to exit after a termination signal
   * before they are force killed and the primary process exits. This is longer
   * than the worker's own force quit timeout so that it can exit first.
   */
  public static readonly gracePeriod =
    ShutdownHelper.forceQuitTimeout + 5 * Second.ms;

  /** The signals that cause the cluster to shut down. */
  public static readonly signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];

  /**
   * Starts the cluster. In the primary process this runs the primary callback
   * and then forks the workers; in a worker process it runs the worker callback.
   *
   * @param options the callbacks and worker count for the cluster.
   * @returns a promise that resolves when the callback for this process completes.
   */
  public static async start({
    primary,
    worker,
    count = os.cpus().length,
  }: ClusterOptions) {
    const current = cluster.worker;
    if (current) {
      return worker(current.id, () => this.disconnect(current));
    }

    cluster.on("disconnect", () => {
      if (this.running) {
        cluster.fork();
      }
    });

    for (const signal of this.signals) {
      process.on(signal, () => this.shutdown(signal));
    }

    await primary?.();

    // A termination signal may arrive while the primary callback runs.
    if (!this.running) {
      return;
    }

    for (let i = 0; i < count; i++) {
      cluster.fork();
    }
  }

  private static running = true;

  private static shutdown(signal: NodeJS.Signals) {
    this.running = false;

    setTimeout(() => {
      for (const worker of Object.values(cluster.workers ?? {})) {
        worker?.process.kill("SIGKILL");
      }
      process.exit();
    }, this.gracePeriod).unref();

    for (const worker of Object.values(cluster.workers ?? {})) {
      worker?.process.kill(signal);
    }
  }

  /**
   * Disconnects the worker after a short delay, so that pending I/O such as
   * log output can flush before the process exits.
   *
   * @param worker the worker to disconnect.
   */
  private static disconnect(worker: Worker) {
    setTimeout(() => worker.disconnect(), 50);
  }
}
