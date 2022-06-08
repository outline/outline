import fs from "fs";
import path from "path";
import util from "util";
import { Context, Next } from "koa";
import { escape } from "lodash";
import documentLoader from "@server/commands/documentLoader";
import env from "@server/env";
import presentEnv from "@server/presenters/env";
import prefetchTags from "@server/utils/prefetchTags";

const isProduction = env.ENVIRONMENT === "production";
const isTest = env.ENVIRONMENT === "test";
const readFile = util.promisify(fs.readFile);

const readIndexFile = async (ctx: Context): Promise<Buffer> => {
  if (isProduction) {
    return readFile(path.join(__dirname, "../../app/index.html"));
  }

  if (isTest) {
    return readFile(path.join(__dirname, "../static/index.html"));
  }

  const middleware = ctx.devMiddleware;
  await new Promise((resolve) => middleware.waitUntilValid(resolve));
  return new Promise((resolve, reject) => {
    middleware.fileSystem.readFile(
      `${ctx.webpackConfig.output.path}/index.html`,
      (err: Error, result: Buffer) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      }
    );
  });
};

export const renderApp = async (
  ctx: Context,
  next: Next,
  options: { title?: string; description?: string; canonical?: string } = {}
) => {
  const {
    title = "Outline",
    description = "A modern team knowledge base for your internal documentation, product specs, support answers, meeting notes, onboarding, &amp; more…",
    canonical = "",
  } = options;

  if (ctx.request.path === "/realtime/") {
    return next();
  }

  const { shareId } = ctx.params;
  const page = await readIndexFile(ctx);
  const environment = `
    window.env = ${JSON.stringify(presentEnv(env))};
  `;
  ctx.body = page
    .toString()
    .replace(/\/\/inject-env\/\//g, environment)
    .replace(/\/\/inject-title\/\//g, escape(title))
    .replace(/\/\/inject-description\/\//g, escape(description))
    .replace(/\/\/inject-canonical\/\//g, canonical)
    .replace(/\/\/inject-prefetch\/\//g, shareId ? "" : prefetchTags)
    .replace(/\/\/inject-slack-app-id\/\//g, env.SLACK_APP_ID || "");
};

export const renderShare = async (ctx: Context, next: Next) => {
  const { shareId, documentSlug } = ctx.params;
  // Find the share record if publicly published so that the document title
  // can be be returned in the server-rendered HTML. This allows it to appear in
  // unfurls with more reliablity
  let share, document;

  try {
    const result = await documentLoader({
      id: documentSlug,
      shareId,
    });
    share = result.share;
    document = result.document;
  } catch (err) {
    // If the share or document does not exist, return a 404.
    ctx.status = 404;
  }

  // Allow shares to be embedded in iframes on other websites
  ctx.remove("X-Frame-Options");

  // Inject share information in SSR HTML
  return renderApp(ctx, next, {
    title: document?.title,
    description: document?.getSummary(),
    canonical: share
      ? `${share.canonicalUrl}${documentSlug && document ? document.url : ""}`
      : undefined,
  });
};
