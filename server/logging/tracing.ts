import { init, tracer } from "@theo.gravity/datadog-apm";

export * as APM from "@theo.gravity/datadog-apm";

// If the DataDog agent is installed and the DD_API_KEY environment variable is
// in the environment then we can safely attempt to start the DD tracer
if (process.env.DD_API_KEY) {
  init(
    {
      // SOURCE_COMMIT is used by Docker Hub
      // SOURCE_VERSION is used by Heroku
      version: process.env.SOURCE_COMMIT || process.env.SOURCE_VERSION,
    },
    {
      useMock: process.env.NODE_ENV === "test",
    }
  );
}

export default tracer;
