import { StatsD } from "hot-shots";
import env from "@server/env";

class Metrics {
  private client: StatsD;

  constructor() {
    this.client = new StatsD({
      prefix: "outline.",
      globalTags: { env: process.env.DD_ENV ?? env.ENVIRONMENT },
      errorHandler: () => {
        // Silently ignore StatsD errors to avoid crashing the server
      },
    });
  }

  gauge(key: string, value: number, tags?: string[]): void {
    this.client.gauge(key, value, tags);
  }

  gaugePerInstance(key: string, value: number, tags: string[] = []): void {
    const instanceId =
      process.env.INSTANCE_ID || process.env.HEROKU_DYNO_ID || process.pid;

    this.client.gauge(key, value, [...tags, `instance:${instanceId}`]);
  }

  increment(key: string, tags?: Record<string, string>): void {
    const tagList = tags
      ? Object.entries(tags).map(([k, v]) => `${k}:${v}`)
      : undefined;

    this.client.increment(key, 1, tagList);
  }

  flush(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.client.close(() => {
        resolve();
      });
    });
  }
}

export default new Metrics();
