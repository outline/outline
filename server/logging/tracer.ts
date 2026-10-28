import cluster from "node:cluster";
import type { IncomingMessage } from "node:http";
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

/**
 * Query string parameters that are kept in traced URLs because they help with
 * debugging and do not grant access. The values of all other parameters are
 * redacted.
 */
const allowedQueryParameters = [
  "client",
  "codemode",
  "documentId",
  "domain",
  "download",
  "error",
  "error_description",
  "eventType",
  "follow",
  "host",
  "id",
  "installation_id",
  "limit",
  "offset",
  "setup_action",
];

/** Matches the value of each query string parameter that is not allowed. */
export const queryStringObfuscation = `(?<=(?:^|&)(?!(?:${allowedQueryParameters.join("|")})=)[^=&]+=)[^&]+`;

/**
 * Replaces the host of a traced URL with the first X-Forwarded-Host value, so
 * that the span shows the host the client requested.
 *
 * @param url the traced URL.
 * @param forwardedHost the value of the X-Forwarded-Host header.
 * @returns the URL with the forwarded host, or the URL unchanged.
 */
export function applyForwardedHost(
  url: string,
  forwardedHost: string | string[] | undefined
): string {
  const value = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  const host = value?.split(",")[0].trim();

  if (!host || !/^[a-z0-9.\-:[\]]+$/i.test(host)) {
    return url;
  }

  let authority: string;
  try {
    authority = new URL(`http://${host}`).host;
  } catch {
    return url;
  }

  return url.replace(/^([a-z]+:\/\/)[^/?#]*/i, `$1${authority}`);
}

interface PrivateSpanContext {
  getTag(key: string): unknown;
  setTag(key: string, value: unknown): void;
}

/**
 * Rewrites the traced URL to use X-Forwarded-Host when Koa trusts proxy
 * headers, as dd-trace always reads the Host header.
 */
function handleRequestFinish(span?: Span, req?: IncomingMessage) {
  if (!span || !req) {
    return;
  }

  const context = span.context() as unknown as PrivateSpanContext;
  const url = context.getTag("http.url");

  if (typeof url === "string") {
    context.setTag(
      "http.url",
      applyForwardedHost(url, req.headers["x-forwarded-host"])
    );
  }
}

// If the DataDog agent is installed and the DD_API_KEY environment variable is
// in the environment then we can safely attempt to start the DD tracer. This
// must happen before any instrumented module is imported.
// Note: the tracer is only loaded in worker processes. The cluster primary
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
  tracer.use("koa", {
    middleware: false,
    queryStringObfuscation,
    hooks:
      env.isProduction && env.PROXY_HEADERS_TRUSTED
        ? { request: handleRequestFinish }
        : undefined,
  });
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
