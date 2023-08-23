import fs from "fs";
import path from "path";
import util from "util";
import { Context, Next } from "koa";
import escape from "lodash/escape";
import { Sequelize } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { IntegrationType, TeamPreference } from "@shared/types";
import documentLoader from "@server/commands/documentLoader";
import env from "@server/env";
import { Integration } from "@server/models";
import presentEnv from "@server/presenters/env";
import { getTeamFromContext } from "@server/utils/passport";
import prefetchTags from "@server/utils/prefetchTags";
import readManifestFile from "@server/utils/readManifestFile";

const isProduction = env.ENVIRONMENT === "production";
const isDevelopment = env.ENVIRONMENT === "development";
const isTest = env.ENVIRONMENT === "test";

const readFile = util.promisify(fs.readFile);
const entry = "app/index.tsx";
const viteHost = env.URL.replace(`:${env.PORT}`, ":3001");

let indexHtmlCache: Buffer | undefined;

const readIndexFile = async (): Promise<Buffer> => {
  if (isProduction || isTest) {
    if (indexHtmlCache) {
      return indexHtmlCache;
    }
  }

  if (isTest) {
    return await readFile(path.join(__dirname, "../static/index.html"));
  }

  if (isDevelopment) {
    return await readFile(
      path.join(__dirname, "../../../server/static/index.html")
    );
  }

  return (indexHtmlCache = await readFile(
    path.join(__dirname, "../../app/index.html")
  ));
};

export const renderApp = async (
  ctx: Context,
  next: Next,
  options: {
    title?: string;
    description?: string;
    canonical?: string;
    shortcutIcon?: string;
    analytics?: Integration | null;
  } = {}
) => {
  const {
    title = env.APP_NAME,
    description = "A modern team knowledge base for your internal documentation, product specs, support answers, meeting notes, onboarding, &amp; more…",
    canonical = "",
    shortcutIcon = `${env.CDN_URL || ""}/images/favicon-32.png`,
  } = options;

  if (ctx.request.path === "/realtime/") {
    return next();
  }

  const { shareId } = ctx.params;
  const page = await readIndexFile();
  const environment = `
    <script nonce="${ctx.state.cspNonce}">
      window.env = ${JSON.stringify(presentEnv(env, options.analytics))};
    </script>
  `;

  const scriptTags = isProduction
    ? `<script type="module" nonce="${ctx.state.cspNonce}" src="${
        env.CDN_URL || ""
      }/static/${readManifestFile()[entry]["file"]}"></script>`
    : `<script type="module" nonce="${ctx.state.cspNonce}">
        import RefreshRuntime from "${viteHost}/static/@react-refresh"
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => { }
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <script type="module" nonce="${ctx.state.cspNonce}" src="${viteHost}/static/@vite/client"></script>
      <script type="module" nonce="${ctx.state.cspNonce}" src="${viteHost}/static/${entry}"></script>
    `;

  ctx.body = page
    .toString()
    .replace(/\{env\}/g, environment)
    .replace(/\{title\}/g, escape(title))
    .replace(/\{description\}/g, escape(description))
    .replace(/\{canonical-url\}/g, canonical)
    .replace(/\{shortcut-icon\}/g, shortcutIcon)
    .replace(/\{prefetch\}/g, shareId ? "" : prefetchTags)
    .replace(/\{slack-app-id\}/g, env.SLACK_APP_ID || "")
    .replace(/\{cdn-url\}/g, env.CDN_URL || "")
    .replace(/\{script-tags\}/g, scriptTags)
    .replace(/\{csp-nonce\}/g, ctx.state.cspNonce);
};

export const renderShare = async (ctx: Context, next: Next) => {
  const { shareId, documentSlug } = ctx.params;
  // Find the share record if publicly published so that the document title
  // can be be returned in the server-rendered HTML. This allows it to appear in
  // unfurls with more reliablity
  let share, document, team, analytics;

  try {
    team = await getTeamFromContext(ctx);
    const result = await documentLoader({
      id: documentSlug,
      shareId,
      teamId: team?.id,
    });
    share = result.share;
    if (isUUID(shareId) && share?.urlId) {
      // Redirect temporarily because the url slug
      // can be modified by the user at any time
      ctx.redirect(share.canonicalUrl);
      ctx.status = 307;
      return;
    }
    document = result.document;

    analytics = await Integration.findOne({
      where: {
        teamId: document.teamId,
        type: IntegrationType.Analytics,
      },
    });

    if (share && !ctx.userAgent.isBot) {
      await share.update({
        lastAccessedAt: new Date(),
        views: Sequelize.literal("views + 1"),
      });
    }
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
    shortcutIcon:
      team?.getPreference(TeamPreference.PublicBranding) && team.avatarUrl
        ? team.avatarUrl
        : undefined,
    analytics,
    canonical: share
      ? `${share.canonicalUrl}${documentSlug && document ? document.url : ""}`
      : undefined,
  });
};
