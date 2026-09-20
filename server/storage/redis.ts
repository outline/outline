import type { RedisOptions } from "ioredis";
import Redis from "ioredis";
import { defaults } from "es-toolkit/compat";
import { errToString } from "@shared/utils/error";
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
        const message = errToString(error);
        throw new Error(`Failed to decode redis adapter options: ${message}`);
      }

      try {
        super(
          defaults(options, { connectionName }, customOptions, defaultOptions)
        );
      } catch (error) {
        const message = errToString(error);
        throw new Error(`Failed to initialize redis client: ${message}`);
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

    // Skip the healthcheck on connections reserved for blocking or pub/sub
    // operations (signalled via maxRetriesPerRequest: null). A PING issued on
    // those connections queues behind the in-flight blocking command and would
    // spuriously time out.
    if (this.options.maxRetriesPerRequest !== null) {
      const healthcheck = setInterval(() => {
        if (this.status !== "ready") {
          return;
        }

        let pingTimeout: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise((_, reject) => {
          pingTimeout = setTimeout(
            () => reject(new Error("ping timeout")),
            env.REDIS_HEALTHCHECK_TIMEOUT
          );
        });

        Promise.race([this.ping(), timeoutPromise])
          .catch((err) => {
            Logger.warn("Redis healthcheck failed, forcing reconnect", {
              error: err,
            });
            this.disconnect(true);
          })
          .finally(() => {
            if (pingTimeout) {
              clearTimeout(pingTimeout);
            }
          });
      }, env.REDIS_HEALTHCHECK_INTERVAL);

      // Don't keep the Node event loop alive solely for the healthcheck.
      healthcheck.unref();

      this.on("end", () => clearInterval(healthcheck));
    }
  }

  /**
   * Add or update a sorted-set member with an increasing score and refresh the
   * key's expiry. Score assignment and insertion are atomic. Scores use Redis
   * time in microseconds, advancing past the highest existing score if needed.
   *
   * @param key the sorted-set key.
   * @param member the member to add or update.
   * @param ttlSeconds the key's expiry in seconds.
   * @returns the assigned sequence number.
   * @throws if Redis fails or returns an invalid sequence.
   */
  public async zaddWithSequence(
    key: string,
    member: string,
    ttlSeconds: number
  ): Promise<number> {
    const result = await this.eval(
      `local now = redis.call('TIME')
       local latest = redis.call('ZREVRANGE', KEYS[1], 0, 0, 'WITHSCORES')
       local score = math.max(tonumber(now[1]) * 1000000 + tonumber(now[2]),
         (tonumber(latest[2]) or 0) + 1)
       local sequence = string.format('%.0f', score)
       redis.call('ZADD', KEYS[1], sequence, ARGV[1])
       redis.call('EXPIRE', KEYS[1], ARGV[2])
       return sequence`,
      1,
      key,
      member,
      ttlSeconds
    );

    if (typeof result !== "string" || !Number.isSafeInteger(Number(result))) {
      throw new Error("Invalid sorted-set sequence");
    }

    return Number(result);
  }

  /**
   * Read the most recently sequenced member of a sorted set.
   *
   * @param key the sorted-set key.
   * @returns the member and its sequence, or undefined if the set is empty.
   */
  public async zlatestWithSequence(
    key: string
  ): Promise<{ member: string; sequence: number } | undefined> {
    const [member, score] = await this.zrevrange(key, 0, 0, "WITHSCORES");
    return member ? { member, sequence: Number(score) } : undefined;
  }

  private static client: RedisAdapter;
  private static subscriber: RedisAdapter;
  private static collabClient: RedisAdapter;
  private static collabSubscriber: RedisAdapter;

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

  /**
   * A Redis adapter for subscriptions to collaboration channels.
   */
  public static get collaborationSubscriber(): RedisAdapter {
    return (
      this.collabSubscriber ||
      (this.collabSubscriber = new this(
        env.REDIS_COLLABORATION_URL || env.REDIS_URL,
        {
          maxRetriesPerRequest: null,
          connectionNameSuffix: "collab-subscriber",
        }
      ))
    );
  }
}
