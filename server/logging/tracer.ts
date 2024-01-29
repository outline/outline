import tracer, { Span } from "dd-trace";
import env from "@server/env";

type PrivateDatadogContext = {
  req: Record<string, any> & {
    _datadog?: {
      span?: Span;
    };
  };
};

// If the DataDog agent is installed and the DD_API_KEY environment variable is
// in the environment then we can safely attempt to start the DD tracer
if (env.DD_API_KEY) {
  tracer.init({
    version: env.VERSION,
    service: env.DD_SERVICE,
    env: env.ENVIRONMENT,
    logInjection: true,
  });
}

const getCurrentSpan = (): Span | null => tracer.scope().active();

/**
 * Add tags to a span to have more context about how and why it was running.
 * If added to the root span, tags are searchable and filterable.
 *
 * @param tags An object with the tags to add to the span
 * @param span An optional span object to add the tags to. If none provided,the current span will be used.
 */
export function addTags(tags: Record<string, any>, span?: Span | null): void {
  if (tracer) {
    const currentSpan = span || getCurrentSpan();

    if (!currentSpan) {
      return;
    }

    currentSpan.addTags(tags);
  }
}

/**
 * The root span is an undocumented internal property that DataDog adds to `context.req`.
 * The root span is required in order to add searchable tags.
 * Unfortunately, there is no API to access the root span directly.
 * See: node_modules/dd-trace/src/plugins/util/web.js
 *
 * @param context A Koa context object
 */
export function getRootSpanFromRequestContext(
  context: PrivateDatadogContext
): Span | null {
  // eslint-disable-next-line no-undef
  return context?.req?._datadog?.span ?? null;
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
 * @param error The error to add to the current span
 */
export function setError(error: Error, span?: Span) {
  if (tracer) {
    addTags(
      {
        errorMessage: error.message,
        "error.type": error.name,
        "error.msg": error.message,
        "error.stack": error.stack,
      },
      span
    );
  }
}

export default tracer;
