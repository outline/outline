import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import type { Context, Next } from "koa";
import escape from "lodash/escape";
import { Sequelize } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { IntegrationType, TeamPreference } from "@shared/types";
import { unicodeCLDRtoISO639 } from "@shared/utils/date";
import env from "@server/env";
import { Integration } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import presentEnv from "@server/presenters/env";
import { getTeamFromContext } from "@server/utils/passport";
import prefetchTags from "@server/utils/prefetchTags";
import readManifestFile from "@server/utils/readManifestFile";
import { loadPublicShare } from "@server/commands/shareLoader";

const readFile = util.promisify(fs.readFile);
const entry = "app/index.tsx";
const viteHost = env.URL.replace(`:${env.PORT}`, ":3001");

let indexHtmlCache: Buffer | undefined;

const readIndexFile = async (): Promise<Buffer> => {
  if (env.isProduction || env.isTest) {
    if (indexHtmlCache) {
      return indexHtmlCache;
    }
  }

  if (env.isTest) {
    return await readFile(path.join(__dirname, "../static/index.html"));
  }

  if (env.isDevelopment) {
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
    content?: string;
    canonical?: string;
    shortcutIcon?: string;
    rootShareId?: string;
    isShare?: boolean;
    analytics?: Integration<IntegrationType.Analytics>[];
    allowIndexing?: boolean;
  } = {}
) => {
  const {
    title = env.APP_NAME,
    description = "A modern team knowledge base for your internal documentation, product specs, support answers, meeting notes, onboarding, &amp; more…",
    canonical = "",
    content = "",
    shortcutIcon = `${env.CDN_URL || ""}/images/favicon-32.png`,
    allowIndexing = true,
  } = options;

  if (ctx.request.path === "/realtime/") {
    return next();
  }

  if (!env.isCloudHosted) {
    options.analytics?.forEach((integration) => {
      if (integration.settings?.instanceUrl) {
        const parsed = new URL(integration.settings?.instanceUrl);
        const csp = ctx.response.get("Content-Security-Policy");
        ctx.set(
          "Content-Security-Policy",
          csp.replace("script-src", `script-src ${parsed.host}`)
        );
      }
    });
  }

  const { shareId } = ctx.params;
  const page = await readIndexFile();
  const environment = `
    <script nonce="${ctx.state.cspNonce}">
      window.env = ${JSON.stringify(presentEnv(env, options)).replace(
        /</g,
        "\\u003c"
      )};
    </script>
  `;

  const scriptTags = env.isProduction
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

  let headTags = `
    <meta name="robots" content="${allowIndexing ? "index, follow" : "noindex, nofollow"}" />
    <link rel="canonical" href="${escape(canonical)}" />
    <link
      rel="shortcut icon"
      type="image/png"
      href="${escape(shortcutIcon)}"
      sizes="32x32"
    />
    `;

  if (options.isShare) {
    headTags += `
    <link rel="sitemap" type="application/xml" href="/api/shares.sitemap?id=${escape(options.rootShareId || shareId)}">
    `;
  } else {
    headTags += prefetchTags;
    headTags += `
    <link rel="manifest" href="/static/manifest.webmanifest" />
    <link
      rel="apple-touch-icon"
      type="image/png"
      href="${env.CDN_URL ?? ""}/images/apple-touch-icon.png"
      sizes="192x192"
    />
    <link
      rel="search"
      type="application/opensearchdescription+xml"
      href="/opensearch.xml"
      title="Outline"
    />
    `;
  }

  // Ensure no caching is performed
  ctx.response.set("Cache-Control", "no-cache, must-revalidate");
  ctx.response.set("Expires", "-1");

  ctx.body = page
    .toString()
    .replace(/\{env\}/g, environment)
    .replace(/\{lang\}/g, unicodeCLDRtoISO639(env.DEFAULT_LANGUAGE))
    .replace(/\{title\}/g, escape(title))
    .replace(/\{description\}/g, escape(description))
    .replace(/\{content\}/g, content)
    .replace(/\{cdn-url\}/g, env.CDN_URL || "")
    .replace(/\{head-tags\}/g, headTags)
    .replace(/\{slack-app-id\}/g, env.public.SLACK_APP_ID || "")
    .replace(/\{script-tags\}/g, scriptTags)
    .replace(/\{csp-nonce\}/g, ctx.state.cspNonce);
};

export const renderShare = async (ctx: Context, next: Next) => {
  const rootShareId = ctx.state?.rootShare?.id;
  const shareId = rootShareId ?? ctx.params.shareId;
  const collectionSlug = ctx.params.collectionSlug;
  const documentSlug = ctx.params.documentSlug;

  // Find the share record if published so that the document title can be returned
  // in the server-rendered HTML. This allows it to appear in unfurls more reliably.
  let share, collection, document, team;
  let analytics: Integration<IntegrationType.Analytics>[] = [];

  try {
    team = await getTeamFromContext(ctx, { includeStateCookie: false });
    const result = await loadPublicShare({
      id: shareId,
      collectionId: collectionSlug,
      documentId: documentSlug,
      teamId: team?.id,
    });
    share = result.share;
    collection = result.collection;
    document = result.document;

    if (isUUID(shareId) && share?.urlId) {
      // Redirect temporarily because the url slug
      // can be modified by the user at any time
      ctx.redirect(share.canonicalUrl);
      ctx.status = 307;
      return;
    }

    analytics = await Integration.findAll({
      where: {
        teamId: share.teamId,
        type: IntegrationType.Analytics,
      },
    });

    if (share && !ctx.userAgent.isBot) {
      await share.update(
        {
          lastAccessedAt: new Date(),
          views: Sequelize.literal("views + 1"),
        },
        {
          hooks: false,
        }
      );
    }
  } catch (_err) {
    // If the share or document does not exist, return a 404.
    ctx.status = 404;
  }

  // If the client explicitly requests markdown and prefers it over HTML,
  // return the document as markdown. This is useful for LLMs and API clients.
  const acceptHeader = ctx.request.headers.accept || "";
  const prefersMarkdown =
    acceptHeader.includes("text/markdown") &&
    ctx.accepts("text/markdown", "text/html") === "text/markdown";

  if (prefersMarkdown && (document || collection)) {
    const markdown = await DocumentHelper.toMarkdown(document || collection!, {
      includeTitle: true,
      signedUrls: 86400, // 24 hours
      teamId: team?.id,
    });
    ctx.type = "text/markdown";
    ctx.body = markdown;
    return;
  }

  // Allow shares to be embedded in iframes on other websites unless prevented by team preference
  const preventEmbedding =
    team?.getPreference(TeamPreference.PreventDocumentEmbedding) ?? false;
  if (!preventEmbedding) {
    ctx.remove("X-Frame-Options");
  }

  const publicBranding =
    team?.getPreference(TeamPreference.PublicBranding) ?? false;

  const title = document
    ? document.title
    : collection
      ? collection.name
      : publicBranding && team?.name
        ? team.name
        : undefined;

  const content =
    document || collection
      ? await DocumentHelper.toHTML(document || collection!, {
          includeStyles: false,
          includeHead: false,
          includeTitle: true,
          signedUrls: true,
        })
      : undefined;

  const canonicalUrl =
    share && share.canonicalUrl !== ctx.request.origin + ctx.request.url
      ? `${share.canonicalUrl}${
          documentSlug && document
            ? document.path
            : collectionSlug && collection
              ? collection.path
              : ""
        }`
      : undefined;

  // Inject share information in SSR HTML
  return renderApp(ctx, next, {
    title,
    description:
      document?.getSummary() ||
      (publicBranding && team?.description ? team.description : undefined),
    content,
    shortcutIcon:
      publicBranding && team?.avatarUrl ? team.avatarUrl : undefined,
    analytics,
    isShare: true,
    rootShareId,
    canonical: canonicalUrl,
    allowIndexing: share?.allowIndexing,
  });
};
