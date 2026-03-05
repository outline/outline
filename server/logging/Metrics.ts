import { StatsD } from "hot-shots";
import env from "@server/env";

class Metrics {
  enabled = !!env.DD_API_KEY;

  private client: StatsD | undefined;

  constructor() {
    if (!this.enabled) {
      return;
    }

    this.client = new StatsD({
      prefix: "outline.",
      globalTags: { env: process.env.DD_ENV ?? env.ENVIRONMENT },
      errorHandler: () => {
        // Silently ignore StatsD errors to avoid crashing the server
      },
    });
  }

  gauge(key: string, value: number, tags?: string[]): void {
    if (!this.enabled) {
      return;
    }

    this.client?.gauge(key, value, tags);
  }

  gaugePerInstance(key: string, value: number, tags: string[] = []): void {
    if (!this.enabled) {
      return;
    }

    const instanceId =
      process.env.INSTANCE_ID || process.env.HEROKU_DYNO_ID || process.pid;

    this.client?.gauge(key, value, [...tags, `instance:${instanceId}`]);
  }

  increment(key: string, tags?: Record<string, string>): void {
    if (!this.enabled) {
      return;
    }

    const tagList = tags
      ? Object.entries(tags).map(([k, v]) => `${k}:${v}`)
      : undefined;

    this.client?.increment(key, 1, tagList);
  }

  flush(): Promise<void> {
    if (!this.enabled || !this.client) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.client?.close(() => {
        resolve();
      });
    });
  }
}

export default new Metrics();
