import crypto from "node:crypto";
import type { Context, Next } from "koa";
import { contentSecurityPolicy } from "koa-helmet";
import uniq from "lodash/uniq";
import env from "@server/env";

const getBucketOrigin = () => {
  if (env.AWS_S3_ACCELERATE_URL) {
    return new URL(env.AWS_S3_ACCELERATE_URL).origin;
  }

  const url = env.AWS_S3_UPLOAD_BUCKET_URL || "";
  if (!url) {
    return;
  }

  try {
    const parsedUrl = new URL(url);

    if (
      env.AWS_S3_UPLOAD_BUCKET_NAME &&
      parsedUrl.hostname.startsWith(`${env.AWS_S3_UPLOAD_BUCKET_NAME}.`)
    ) {
      const hostnameWithoutBucket = parsedUrl.hostname.substring(
        env.AWS_S3_UPLOAD_BUCKET_NAME.length + 1 // +1 for the dot
      );
      return `${parsedUrl.protocol}//${hostnameWithoutBucket}`;
    }

    return parsedUrl.origin;
  } catch {
    return;
  }
};

/**
 * Create a Content Security Policy middleware for the application.
 */
export default function createCSPMiddleware() {
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
    scriptSrc.push(env.URL.replace(`:${env.PORT}`, ":3001"));
    scriptSrc.push("localhost:3001");
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

  const bucketOrigin = getBucketOrigin();
  if (bucketOrigin) {
    objectSrc.push(bucketOrigin);
  }

  return function cspMiddleware(ctx: Context, next: Next) {
    ctx.state.cspNonce = crypto.randomBytes(16).toString("hex");

    return contentSecurityPolicy({
      directives: {
        baseUri: ["'none'"],
        defaultSrc,
        styleSrc,
        scriptSrc: [
          ...uniq(scriptSrc),
          env.DEVELOPMENT_UNSAFE_INLINE_CSP
            ? "'unsafe-inline'"
            : `'nonce-${ctx.state.cspNonce}'`,
        ],
        mediaSrc: ["*", "data:", "blob:"],
        imgSrc: ["*", "data:", "blob:"],
        frameSrc: ["*", "data:"],
        objectSrc,
        // Do not use connect-src: because self + websockets does not work in
        // Safari, ref: https://bugs.webkit.org/show_bug.cgi?id=201591
        connectSrc: ["*"],
      },
    })(ctx, next);
  };
}
