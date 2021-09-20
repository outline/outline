// @flow
import ddMetrics from "datadog-metrics";

class Metrics {
  enabled: boolean = !!process.env.DD_API_KEY;

  constructor() {
    if (!this.enabled) {
      return;
    }

    ddMetrics.init({
      apiKey: process.env.DD_API_KEY,
      prefix: "outline.",
      defaultTags: [`env:${process.env.DD_ENV || process.env.NODE_ENV}`],
    });
  }

  gauge(key: string, value: number, tags?: string[]): void {
    if (!this.enabled) {
      return;
    }

    return ddMetrics.gauge(key, value, tags);
  }

  gaugePerInstance(key: string, value: number, tags?: string[] = []): void {
    if (!this.enabled) {
      return;
    }

    const instanceId = process.env.INSTANCE_ID || process.env.HEROKU_DYNO_ID;
    if (!instanceId) {
      throw new Error(
        "INSTANCE_ID or HEROKU_DYNO_ID must be set when using DataDog"
      );
    }

    return ddMetrics.gauge(key, value, [...tags, `instance:${instanceId}`]);
  }

  increment(key: string, tags?: { [string]: string }): void {
    if (!this.enabled) {
      return;
    }

    return ddMetrics.increment(key, tags);
  }
}

export default new Metrics();
