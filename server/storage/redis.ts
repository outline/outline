import type { RedisOptions } from "ioredis";
import Redis from "ioredis";
import defaults from "lodash/defaults";
import env from "@server/env";
import Logger from "@server/logging/Logger";

type RedisAdapterOptions = RedisOptions & {
  /** Suffix to append to the connection name that will be displayed in Redis */
  connectionNameSuffix?: string;
  /** Whether to skip the key prefix for this client (used for Bull queues) */
  skipKeyPrefix?: boolean;
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
    { connectionNameSuffix, skipKeyPrefix, ...options }: RedisAdapterOptions = {}
  ) {
    /**
     * For debugging. The connection name is based on the services running in
     * this process. Note that this does not need to be unique.
     */
    const connectionNamePrefix = env.isDevelopment ? process.pid : "outline";
    const connectionName =
      `${connectionNamePrefix}:${env.SERVICES.join("-")}` +
      (connectionNameSuffix ? `:${connectionNameSuffix}` : "");

    // Apply keyPrefix only if not skipped. Bull clients need to skip this because
    // Bull's Lua scripts construct keys at runtime without awareness of ioredis's
    // keyPrefix configuration.
    const keyPrefixOption =
      !skipKeyPrefix && env.REDIS_KEY_PREFIX
        ? { keyPrefix: env.REDIS_KEY_PREFIX }
        : {};

    if (!url || !url.startsWith("ioredis://")) {
      super(
        url || env.REDIS_URL || "",
        defaults(options, { connectionName }, keyPrefixOption, defaultOptions)
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
          defaults(options, { connectionName }, keyPrefixOption, customOptions, defaultOptions)
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
  private static bullClient: RedisAdapter;
  private static bullSubscriber: RedisAdapter;

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
   * A Redis adapter for Bull queue operations. Bull's Lua scripts construct
   * keys at runtime without awareness of ioredis's keyPrefix, so we use
   * Bull's native `prefix` option instead.
   */
  public static get defaultBullClient(): RedisAdapter {
    return (
      this.bullClient ||
      (this.bullClient = new this(env.REDIS_URL, {
        connectionNameSuffix: "bull-client",
        skipKeyPrefix: true,
      }))
    );
  }

  /**
   * A Redis subscriber for Bull queue operations.
   */
  public static get defaultBullSubscriber(): RedisAdapter {
    return (
      this.bullSubscriber ||
      (this.bullSubscriber = new this(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        connectionNameSuffix: "bull-subscriber",
        skipKeyPrefix: true,
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
