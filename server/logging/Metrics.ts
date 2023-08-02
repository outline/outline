import ddMetrics from "datadog-metrics";
import env from "@server/env";

class Metrics {
  enabled = !!env.DD_API_KEY;

  constructor() {
    if (!this.enabled) {
      return;
    }

    ddMetrics.init({
      apiKey: env.DD_API_KEY,
      prefix: "outline.",
      defaultTags: [`env:${process.env.DD_ENV ?? env.ENVIRONMENT}`],
    });
  }

  gauge(key: string, value: number, tags?: string[]): void {
    if (!this.enabled) {
      return;
    }

    return ddMetrics.gauge(key, value, tags);
  }

  gaugePerInstance(key: string, value: number, tags: string[] = []): void {
    if (!this.enabled) {
      return;
    }

    const instanceId =
      process.env.INSTANCE_ID || process.env.HEROKU_DYNO_ID || process.pid;

    return ddMetrics.gauge(key, value, [...tags, `instance:${instanceId}`]);
  }

  increment(key: string, _tags?: Record<string, string>): void {
    if (!this.enabled) {
      return;
    }

    return ddMetrics.increment(key);
  }

  flush(): Promise<void> {
    if (!this.enabled) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      ddMetrics.flush(resolve, reject);
    });
  }
}

export default new Metrics();
