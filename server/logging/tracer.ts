import cluster from "node:cluster";
import type { Span, Tracer } from "dd-trace";
import env from "@server/env";

interface ReportableError extends Error {
  isReportable?: boolean;
}

/** Whether the error has been explicitly marked as non-reportable. */
function isExplicitlyNonReportable(error: Error): error is ReportableError {
  return (
    "isReportable" in error && (error as ReportableError).isReportable === false
  );
}

type PrivateDatadogContext = {
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  req: Record<string, any> & {
    _datadog?: {
      span?: Span;
    };
  };
};

// dd-trace patches Node internals on require and is comparatively expensive to
// load, so it is kept off the startup path unless APM is actually enabled. When
// disabled we fall back to a no-op tracer that satisfies the surface consumed by
// callers (see tracing.ts) so they don't need to branch.
const noopSpan = {
  addTags: () => noopSpan,
  setTag: () => noopSpan,
  finish: () => undefined,
} as unknown as Span;

let tracer: Tracer;

// The default dd-trace query string obfuscation, extended to redact the OAuth
// authorization code that providers send to the auth callback routes.
const queryStringObfuscation = [
  String.raw`(?:p(?:ass)?w(?:or)?d|pass(?:_?phrase)?|secret|(?:api_?|private_?|public_?|access_?|secret_?)key(?:_?id)?|token|consumer_?(?:id|key|secret)|sign(?:ed|ature)?|auth(?:entication|orization)?)(?:(?:\s|%20)*(?:=|%3D)[^&]+|(?:"|%22)(?:\s|%20)*(?::|%3A)(?:\s|%20)*(?:"|%22)(?:%2[^2]|%[^2]|[^"%])+(?:"|%22))`,
  String.raw`bearer(?:\s|%20)+[a-z0-9\._\-]+`,
  String.raw`token(?::|%3A)[a-z0-9]{13}`,
  String.raw`gh[opsu]_[0-9a-zA-Z]{36}`,
  String.raw`ey[I-L](?:[\w=-]|%3D)+\.ey[I-L](?:[\w=-]|%3D)+(?:\.(?:[\w.+\/=-]|%3D|%2F|%2B)+)?`,
  String.raw`[\-]{5}BEGIN(?:[a-z\s]|%20)+PRIVATE(?:\s|%20)KEY[\-]{5}[^\-]+[\-]{5}END(?:[a-z\s]|%20)+PRIVATE(?:\s|%20)KEY`,
  String.raw`ssh-rsa(?:\s|%20)*(?:[a-z0-9\/\.+]|%2F|%5C|%2B){100,}`,
  String.raw`(?<=^|&)code=[^&]+`,
].join("|");

// If the DataDog agent is installed and the DD_API_KEY environment variable is
// in the environment then we can safely attempt to start the DD tracer. This
// must happen before any instrumented module is imported.
// Note: the tracer is only loaded in worker processes. The throng master
// supervises forked workers and never serves traffic.
if (env.DD_API_KEY && cluster.isWorker) {
  // oxlint-disable-next-line typescript/no-require-imports -- kept lazy so dd-trace stays off the startup path
  const ddTrace = require("dd-trace") as { default?: Tracer };
  tracer = ddTrace.default ?? (ddTrace as unknown as Tracer);

  tracer.init({
    version: env.VERSION,
    service: env.DD_SERVICE,
    env: env.ENVIRONMENT,
    logInjection: true,
  });

  // Disable per-middleware spans so that non-reportable errors are not captured
  // This is also generally excessive noise
  tracer.use("koa", { middleware: false, queryStringObfuscation });
  tracer.use("http", { server: { queryStringObfuscation } });
} else {
  tracer = {
    scope: () => ({
      active: () => null,
      activate: <T>(_span: Span, fn: () => T) => fn(),
    }),
    startSpan: () => noopSpan,
  } as unknown as Tracer;
}

const getCurrentSpan = (): Span | null => tracer.scope().active();

/**
 * Add tags to a span to have more context about how and why it was running.
 * If added to the root span, tags are searchable and filterable.
 *
 * @param tags An object with the tags to add to the span
 * @param span An optional span object to add the tags to. If none provided,the current span will be used.
 */
export function addTags(
  tags: Parameters<Span["addTags"]>[0],
  span?: Span | null
): void {
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
 * safe use in environments where APM is disabled. Errors with isReportable set
 * to false are skipped.
 *
 * @param error The error to add to the current span.
 */
export function setError(error: Error, span?: Span) {
  if (isExplicitlyNonReportable(error)) {
    return;
  }

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
