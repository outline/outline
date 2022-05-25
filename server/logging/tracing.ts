import { init, tracer, addTags, markAsError } from "@theo.gravity/datadog-apm";
import env from "@server/env";

export * as APM from "@theo.gravity/datadog-apm";

// If the DataDog agent is installed and the DD_API_KEY environment variable is
// in the environment then we can safely attempt to start the DD tracer
if (env.DD_API_KEY) {
  init(
    {
      // SOURCE_COMMIT is used by Docker Hub
      // SOURCE_VERSION is used by Heroku
      version: process.env.SOURCE_COMMIT || process.env.SOURCE_VERSION,
      service: process.env.DD_SERVICE || "outline",
    },
    {
      useMock: env.ENVIRONMENT === "test",
    }
  );
}

/**
 * Change the resource of the active APM span. This method wraps addTags to allow
 * safe use in environments where APM is disabled.
 *
 * @param name The name of the resource
 */
export function setResource(name: string) {
  if (tracer) {
    addTags({
      "resource.name": `${name}`,
    });
  }
}

/**
 * Mark the current active span as an error. This method wraps addTags to allow
 * safe use in environments where APM is disabled.
 *
 * @param error The error to add
 */
export function setError(error: Error) {
  if (tracer) {
    markAsError(error);
  }
}

export default tracer;
