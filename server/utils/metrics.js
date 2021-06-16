// @flow
import metrics from "datadog-metrics";

if (process.env.DD_API_KEY) {
  metrics.init({
    apiKey: process.env.DD_API_KEY,
    prefix: "outline.",
    defaultTags: [`env:${process.env.DD_ENV || process.env.NODE_ENV}`],
  });
}

export function gauge(key: string, value: number): void {
  if (!process.env.DD_API_KEY) {
    return;
  }

  return metrics.gauge(key, value);
}

export function increment(key: string, tags?: { [string]: string }): void {
  if (!process.env.DD_API_KEY) {
    return;
  }

  return metrics.increment(key, tags);
}
