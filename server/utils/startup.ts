import { fork } from "node:child_process";
import cluster from "node:cluster";
import os from "node:os";
import path from "node:path";
import { styleText } from "node:util";
import env from "@server/env";
import Logger from "@server/logging/Logger";

/**
 * Applies a default V8 heap limit to forked service processes when the process
 * is running under a memory constraint (e.g. a container limit) and no limit
 * was configured explicitly. Without this, V8 sizes its heap from the host's
 * total memory, so several forked processes can together commit far more
 * memory than the container allows and are eventually OOM-killed.
 *
 * The limit can be overridden by setting `--max-old-space-size` in
 * `NODE_OPTIONS` or on the command line.
 *
 * @param processCount the number of service processes that will be forked.
 */
export function configureChildHeapLimit(processCount: number) {
  if (cluster.isWorker) {
    return;
  }

  const nodeOptions = process.env.NODE_OPTIONS ?? "";
  const isConfigured =
    nodeOptions.includes("--max-old-space-size") ||
    process.execArgv.some((arg) => arg.startsWith("--max-old-space-size"));
  if (isConfigured) {
    return;
  }

  // constrainedMemory() reports 0/undefined when unknown, and an effectively
  // unlimited sentinel (2^64) when no cgroup limit is set — only apply a
  // default when a real constraint below the host's total memory exists.
  const constrainedMemory = process.constrainedMemory();
  if (!constrainedMemory || constrainedMemory >= os.totalmem()) {
    return;
  }

  // Budget ~80% of the constraint for V8 heaps across all forked processes,
  // leaving headroom for the master process and non-heap memory such as
  // compiled code, buffers, and native allocations.
  const totalMB = constrainedMemory / 1024 / 1024;
  const budgetMB = Math.floor((totalMB * 0.8) / Math.max(1, processCount));

  // Below 256MB per process the server cannot operate reliably, so the floor
  // is applied even though the combined heaps may then exceed the budget.
  const heapMB = Math.max(256, budgetMB);
  if (heapMB > budgetMB) {
    Logger.warn(
      `The available memory of ${Math.round(totalMB)}MB is low for ${processCount} service process(es); reduce process count or increase available memory`
    );
  }

  // Forked processes parse NODE_OPTIONS on startup, so this applies to every
  // service process without affecting the already-running master.
  process.env.NODE_OPTIONS =
    `${nodeOptions} --max-old-space-size=${heapMB}`.trim();

  Logger.info(
    "lifecycle",
    `Memory constraint of ${Math.round(totalMB)}MB detected, defaulting each service process to a ${heapMB}MB heap limit`
  );
}

/**
 * Runs the database connection and pending migration checks in a short-lived
 * child process, resolving once it exits successfully. Running these checks out
 * of process keeps the long-lived master free of the Sequelize models graph.
 *
 * @returns a promise that resolves when the checks have completed successfully.
 */
export function checkPendingMigrations(): Promise<void> {
  return new Promise((resolve) => {
    const child = fork(
      path.join(__dirname, "..", "scripts", "checkMigrations.js"),
      process.argv.slice(2),
      // Run without the parent's CLI flags so an inherited --inspect port does
      // not clash; the heap limit is inherited via NODE_OPTIONS in the env.
      { execArgv: [], stdio: ["inherit", "inherit", "inherit", "ipc"] }
    );

    child.once("error", (err) => {
      Logger.fatal("Failed to run database migration checks", err);
    });

    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      process.exit(code ?? 1);
    });
  });
}

/**
 * Prints information about the current environment to the log on startup.
 */
export async function printEnv() {
  if (env.isProduction) {
    Logger.info(
      "lifecycle",
      styleText(
        "green",
        `
Is your team enjoying Outline? Consider supporting future development by sponsoring the project:\n\nhttps://github.com/sponsors/outline
`
      )
    );
  } else if (env.isDevelopment) {
    Logger.warn(
      `Running Outline in ${styleText(
        "bold",
        "development mode"
      )}. To run Outline in production mode set the ${styleText(
        "bold",
        "NODE_ENV"
      )} env variable to "production"`
    );
  }
}
