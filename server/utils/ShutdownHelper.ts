import groupBy from "lodash/groupBy";
import Logger from "@server/logging/Logger";
import { sleep } from "./timers";

export enum ShutdownOrder {
  first = 0,
  normal = 1,
  last = 2,
}

type Handler = {
  name: string;
  order: ShutdownOrder;
  callback: () => Promise<unknown>;
};

export default class ShutdownHelper {
  /**
   * The amount of time to wait for connections to close before forcefully
   * closing them. This allows for regular HTTP requests to complete but
   * prevents long running requests from blocking shutdown.
   */
  public static readonly connectionGraceTimeout = 5 * 1000;

  /**
   * The maximum amount of time to wait for ongoing work to finish before
   * force quitting the process. In the event of a force quit, the process
   * will exit with a non-zero exit code.
   */
  public static readonly forceQuitTimeout = 60 * 1000;

  /** Whether the server is currently shutting down */
  private static isShuttingDown = false;

  /** List of shutdown handlers to execute */
  private static handlers: Handler[] = [];

  /**
   * Add a shutdown handler to be executed when the process is exiting
   *
   * @param name The name of the handler
   * @param callback The callback to execute
   */
  public static add(
    name: string,
    order: ShutdownOrder,
    callback: () => Promise<unknown>
  ) {
    this.handlers.push({ name, order, callback });
  }

  /**
   * Exit the process after all shutdown handlers have completed
   */
  public static async execute() {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;

    // Start the shutdown timer
    void sleep(this.forceQuitTimeout).then(() => {
      Logger.info("lifecycle", "Force quitting");
      process.exit(1);
    });

    // Group handlers by order
    const shutdownGroups = groupBy(this.handlers, "order");
    const orderedKeys = Object.keys(shutdownGroups).sort();

    // Execute handlers in order
    for (const key of orderedKeys) {
      Logger.debug("lifecycle", `Running shutdown group ${key}`);
      const handlers = shutdownGroups[key];

      await Promise.allSettled(
        handlers.map(async (handler) => {
          Logger.debug("lifecycle", `Running shutdown handler ${handler.name}`);

          await handler.callback().catch((error) => {
            Logger.error(
              `Error inside shutdown handler ${handler.name}`,
              error,
              {
                name: handler.name,
              }
            );
          });
        })
      );
    }

    Logger.info("lifecycle", "Gracefully quitting");
    process.exit(0);
  }
}
