import crypto from "node:crypto";
import type { Context, Next } from "koa";
import helmet from "koa-helmet";
import { asyncNoop } from "es-toolkit";
import { uniq } from "es-toolkit/compat";
import env from "@server/env";

const getBucketOrigins = (): string[] => {
  if (env.AWS_S3_ACCELERATE_URL) {
    return [new URL(env.AWS_S3_ACCELERATE_URL).origin];
  }

  const url = env.AWS_S3_UPLOAD_BUCKET_URL || "";
  if (!url) {
    return [];
  }

  try {
    const parsedUrl = new URL(url);
    const bucket = env.AWS_S3_UPLOAD_BUCKET_NAME;
    const host =
      bucket && parsedUrl.host.startsWith(`${bucket}.`)
        ? parsedUrl.host.substring(bucket.length + 1) // +1 for the dot
        : parsedUrl.host;
    const origins = [`${parsedUrl.protocol}//${host}`];

    // Without path-style the S3 client signs urls on the bucket subdomain.
    if (bucket && !env.AWS_S3_FORCE_PATH_STYLE) {
      origins.push(`${parsedUrl.protocol}//${bucket}.${host}`);
    }

    return origins;
  } catch {
    return [];
  }
};

const getCloudFrontOrigin = () => {
  if (!env.AWS_CLOUDFRONT_URL) {
    return;
  }

  try {
    return new URL(env.AWS_CLOUDFRONT_URL).origin;
  } catch {
    return;
  }
};

interface CSPOptions {
  /** Additional origins to allow as script sources. */
  extraScriptSrc?: string[];
}

/**
 * Allow additional origins as script sources in the Content Security Policy of
 * the current response. Must be called before the response is sent.
 *
 * @param ctx The Koa context of the current request.
 * @param sources The origins to allow.
 */
export function allowScriptSrc(ctx: Context, sources: string[]) {
  ctx.state.cspScriptSrc = [...(ctx.state.cspScriptSrc ?? []), ...sources];
}

/**
 * Allow additional origins as style sources in the Content Security Policy of
 * the current response. Must be called before the response is sent.
 *
 * @param ctx The Koa context of the current request.
 * @param sources The origins to allow.
 */
export function allowStyleSrc(ctx: Context, sources: string[]) {
  ctx.state.cspStyleSrc = [...(ctx.state.cspStyleSrc ?? []), ...sources];
}

/**
 * Allow the current response to be rendered in a frame on any origin. Must be
 * called before the response is sent.
 *
 * @param ctx The Koa context of the current request.
 */
export function allowFraming(ctx: Context) {
  ctx.state.cspAllowFraming = true;
  ctx.remove("X-Frame-Options");
}

/**
 * Create a Content Security Policy middleware for the application.
 *
 * @param options Optional configuration for the CSP middleware.
 * @returns A Koa middleware function that applies the CSP headers.
 */
export default function createCSPMiddleware(options?: CSPOptions) {
  // Construct scripts CSP based on options in use
  const defaultSrc: string[] = ["'self'"];
  const scriptSrc: string[] = [];
  const styleSrc: string[] = ["'self'", "'unsafe-inline'"];
  const objectSrc: string[] = [env.URL, "'self'"];

  if (env.isCloudHosted) {
    scriptSrc.push("www.googletagmanager.com");
    scriptSrc.push("cdn.zapier.com");
    styleSrc.push("cdn.zapier.com");
  }

  // Allow to load assets from Vite
  if (!env.isProduction) {
    scriptSrc.push(env.URL.replace(`:${env.PORT}`, `:${env.vitePort}`));
    scriptSrc.push(`localhost:${env.vitePort}`);
  } else {
    scriptSrc.push(env.URL);
  }

  if (env.GOOGLE_ANALYTICS_ID) {
    scriptSrc.push("www.googletagmanager.com");
    scriptSrc.push("www.google-analytics.com");
  }

  if (env.CDN_URL) {
    scriptSrc.push(env.CDN_URL);
    styleSrc.push(env.CDN_URL);
    defaultSrc.push(env.CDN_URL);
  }

  objectSrc.push(...getBucketOrigins());

  const cloudFrontOrigin = getCloudFrontOrigin();
  if (cloudFrontOrigin) {
    objectSrc.push(cloudFrontOrigin);
  }

  return async function cspMiddleware(ctx: Context, next: Next) {
    ctx.state.cspNonce = crypto.randomBytes(16).toString("hex");
    ctx.state.cspScriptSrc = [];
    ctx.state.cspStyleSrc = [];

    try {
      await next();
    } finally {
      // The policy is written once downstream middleware has had the chance to
      // allow additional sources for the response, see `allowScriptSrc` and
      // `allowStyleSrc`.
      if (!ctx.res.headersSent) {
        // The service worker is served from the same origin as the document,
        // which may be a custom domain that is not present in scriptSrc.
        const directives = {
          baseUri: ["'none'"],
          defaultSrc,
          styleSrc: uniq([...styleSrc, ...(ctx.state.cspStyleSrc as string[])]),
          scriptSrc: uniq([
            ...scriptSrc,
            // Allow the service worker to importScripts the workbox runtime,
            // which is served under /static on the document host.. Scoped to
            // the /static path so only immutable build assets are permitted,
            // not ugc served elsewhere on the same origin.
            `${ctx.host}/static/`,
            ...(options?.extraScriptSrc ?? []),
            ...(ctx.state.cspScriptSrc as string[]),
            env.DEVELOPMENT_UNSAFE_INLINE_CSP
              ? "'unsafe-inline'"
              : `'nonce-${ctx.state.cspNonce}'`,
          ]),
          mediaSrc: ["*", "data:", "blob:"],
          imgSrc: ["*", "data:", "blob:"],
          frameSrc: ["*", "data:"],
          workerSrc: ["'self'"],
          objectSrc,
          // Do not use connect-src: because self + websockets does not work in
          // Safari, ref: https://bugs.webkit.org/show_bug.cgi?id=201591
          connectSrc: ["*"],
          ...(ctx.state.cspAllowFraming ? {} : { frameAncestors: ["'self'"] }),
        };

        // Helmet's default directives are not merged in, they include
        // form-action restrictions that break OAuth redirects.
        await helmet.contentSecurityPolicy({ useDefaults: false, directives })(
          ctx,
          asyncNoop
        );
      }
    }
  };
}
