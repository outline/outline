import type { RedisOptions } from "ioredis";
import Redis from "ioredis";
import defaults from "lodash/defaults";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { getConnectionName } from "./utils";

type RedisAdapterOptions = RedisOptions & {
  /** Suffix to append to the connection name that will be displayed in Redis */
  connectionNameSuffix?: string;
};

const defaultOptions: RedisOptions = {
  maxRetriesPerRequest: 20,
  enableReadyCheck: false,
  showFriendlyErrorStack: env.isDevelopment,
  keepAlive: 10000,

  retryStrategy(times: number) {
    if (times === 1) {
      Logger.info("lifecycle", `Retrying redis connection: attempt ${times}`);
    } else {
      Logger.warn(`Retrying redis connection: attempt ${times}`);
    }
    return Math.min(times * 500, 3000);
  },

  reconnectOnError(err) {
    return err.message.includes("READONLY");
  },

  // support Heroku Redis, see:
  // https://devcenter.heroku.com/articles/heroku-redis#ioredis-module
  tls: (env.REDIS_URL || "").startsWith("rediss://")
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
};

export default class RedisAdapter extends Redis {
  constructor(
    url: string | undefined,
    { connectionNameSuffix, ...options }: RedisAdapterOptions = {}
  ) {
    const connectionName = getConnectionName(connectionNameSuffix);

    if (!url || !url.startsWith("ioredis://")) {
      super(
        url || env.REDIS_URL || "",
        defaults(options, { connectionName }, defaultOptions)
      );
    } else {
      let customOptions = {};
      try {
        const decodedString = Buffer.from(url.slice(10), "base64").toString();
        customOptions = JSON.parse(decodedString);
      } catch (error) {
        throw new Error(`Failed to decode redis adapter options: ${error}`);
      }

      try {
        super(
          defaults(options, { connectionName }, customOptions, defaultOptions)
        );
      } catch (error) {
        throw new Error(`Failed to initialize redis client: ${error}`);
      }
    }

    // More than the default of 10 listeners is expected for the amount of queues
    // we're running. Increase the max here to prevent a warning in the console:
    // https://github.com/OptimalBits/bull/issues/1192
    this.setMaxListeners(100);

    this.on("error", (err) => {
      if (err.name === "MaxRetriesPerRequestError") {
        Logger.fatal("Redis maximum retries exceeded", err);
      } else {
        Logger.error("Redis error", err);
      }
    });
  }

  private static client: RedisAdapter;
  private static subscriber: RedisAdapter;
  private static collabClient: RedisAdapter;

  public static get defaultClient(): RedisAdapter {
    return (
      this.client ||
      (this.client = new this(env.REDIS_URL, {
        connectionNameSuffix: "client",
      }))
    );
  }

  public static get defaultSubscriber(): RedisAdapter {
    return (
      this.subscriber ||
      (this.subscriber = new this(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        connectionNameSuffix: "subscriber",
      }))
    );
  }

  /**
   * A Redis adapter for collaboration-related operations.
   */
  public static get collaborationClient(): RedisAdapter {
    if (!env.REDIS_COLLABORATION_URL) {
      return this.defaultClient;
    }

    return (
      this.collabClient ||
      (this.collabClient = new this(env.REDIS_COLLABORATION_URL, {
        connectionNameSuffix: "collab",
      }))
    );
  }
}
