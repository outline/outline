// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'data... Remove this comment to see the full error message
import ddMetrics from "datadog-metrics";

class Metrics {
  enabled = !!process.env.DD_API_KEY;

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

  // @ts-expect-error ts-migrate(1015) FIXME: Parameter cannot have question mark and initialize... Remove this comment to see the full error message
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

  increment(key: string, tags?: Record<string, string>): void {
    if (!this.enabled) {
      return;
    }

    return ddMetrics.increment(key, tags);
  }
}

export default new Metrics();
