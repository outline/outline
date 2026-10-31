import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import type { Context, Next } from "koa";
import { escape } from "es-toolkit/compat";
import { isbot } from "isbot";
import { Sequelize } from "sequelize";
import isUUID from "validator/lib/isUUID";
import {
  TeamPreference,
  type IntegrationType,
  type NavigationNode,
} from "@shared/types";
import { unicodeCLDRtoISO639 } from "@shared/utils/date";
import { Hour } from "@shared/utils/time";
import env from "@server/env";
import { allowFraming, allowScriptSrc } from "@server/middlewares/csp";
import { Integration } from "@server/models";
import type { Collection, Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import IntegrationHelper from "@server/models/helpers/IntegrationHelper";
import { TextHelper } from "@server/models/helpers/TextHelper";
import presentEnv from "@server/presenters/env";
import { CacheHelper } from "@server/utils/CacheHelper";
import { getTeamFromContext } from "@server/utils/passport";
import prefetchTags from "@server/utils/prefetchTags";
import readManifestFile from "@server/utils/readManifestFile";
import { RedisPrefixHelper } from "@server/utils/RedisPrefixHelper";
import { loadPublicShare } from "@server/commands/shareLoader";

const readFile = util.promisify(fs.readFile);
const entry = "app/index.tsx";
const viteHost = env.URL.replace(`:${env.PORT}`, `:${env.vitePort}`);

let indexHtmlCache: Buffer | undefined;

/**
 * Formats navigation tree children as markdown list items.
 *
 * @param children Array of navigation nodes
 * @param baseUrl Base URL for generating links
 * @returns Formatted markdown string
 */
function formatChildDocumentsAsMarkdown(
  children: NavigationNode[],
  baseUrl: string
): string {
  if (!children || children.length === 0) {
    return "";
  }

  const lines = children.map((child) => {
    const url = baseUrl + child.url;
    return `- [${child.title}](${url})`;
  });

  return `\n\n---\n\n**Documents**\n\n${lines.join("\n")}`;
}

/**
 * Renders the server-side HTML of a shared document or collection. The HTML is
 * cached for each version of the model, and attachment urls are signed on each
 * request.
 *
 * @param model The shared document or collection.
 * @returns The HTML string, or undefined if it could not be rendered.
 */
async function renderShareContent(
  model: Document | Collection
): Promise<string | undefined> {
  const html = await CacheHelper.getDataOrSet<string>(
    RedisPrefixHelper.getShareContentKey(model.id, model.updatedAt),
    () => DocumentHelper.toStaticHTML(model),
    Hour.seconds
  );
  if (!html) {
    return undefined;
  }
  return TextHelper.attachmentsToSignedUrls(html, model.teamId, Hour.seconds);
}

/**
 * Builds Open Graph and Twitter card meta tags for link unfurls.
 *
 * @param tags The values to include, empty values are omitted.
 * @returns HTML meta tags.
 */
function socialMetaTags(tags: {
  title: string;
  description: string;
  url: string;
  siteName: string;
  image?: string;
}): string {
  const properties: [string, string, string | undefined][] = [
    ["property", "og:type", "article"],
    ["property", "og:site_name", tags.siteName],
    ["property", "og:title", tags.title],
    ["property", "og:description", tags.description],
    ["property", "og:url", tags.url],
    ["property", "og:image", tags.image],
    ["name", "twitter:card", "summary"],
    ["name", "twitter:title", tags.title],
    ["name", "twitter:description", tags.description],
    ["name", "twitter:image", tags.image],
  ];

  return properties
    .filter(([, , content]) => content)
    .map(
      ([attribute, key, content]) =>
        `<meta ${attribute}="${key}" content="${escape(content)}" />`
    )
    .join("\n    ");
}

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
    image?: string;
    siteName?: string;
    rootShareId?: string;
    isShare?: boolean;
    markdownUrl?: string;
    analytics?: Integration<IntegrationType.Analytics>[];
    allowIndexing?: boolean;
  } = {}
) => {
  const {
    title = env.APP_NAME,
    description = "A modern team knowledge base for your internal documentation, product specs, support answers, meeting notes, onboarding, & more…",
    canonical = "",
    siteName = env.APP_NAME,
    content = "",
    shortcutIcon = `${env.CDN_URL || ""}/images/favicon-32.png`,
    allowIndexing = false,
  } = options;

  if (ctx.request.path === "/realtime/") {
    return next();
  }

  allowScriptSrc(
    ctx,
    IntegrationHelper.getAnalyticsScriptSrc(options.analytics)
  );

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

  const alternateTag = options.markdownUrl
    ? `<link rel="alternate" type="text/markdown" href="${escape(options.markdownUrl)}" />`
    : "";

  let headTags = `
    <meta name="robots" content="${allowIndexing ? "index, follow" : "noindex, nofollow"}" />
    <link rel="canonical" href="${escape(canonical)}" />
    ${alternateTag}
    <link
      rel="shortcut icon"
      type="image/png"
      href="${escape(shortcutIcon)}"
      sizes="32x32"
    />
    `;

  if (options.isShare) {
    headTags += socialMetaTags({
      title,
      description,
      url: canonical,
      siteName,
      image: options.image,
    });
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
      href="${env.CDN_URL ?? ""}/images/icon-maskable-192.png"
      sizes="192x192"
    />
    <link
      rel="apple-touch-icon"
      type="image/png"
      href="${env.CDN_URL ?? ""}/images/icon-maskable-512.png"
      sizes="512x512"
    />
    <link
      rel="apple-touch-icon"
      type="image/png"
      href="${env.CDN_URL ?? ""}/images/icon-maskable-1024.png"
      sizes="1024x1024"
    />
    <link
      rel="search"
      type="application/opensearchdescription+xml"
      href="/opensearch.xml"
      title="Outline"
    />
    `;
  }

  // Advertise the markdown representation so that clients can discover it from
  // the response headers alone, without parsing the page.
  if (options.markdownUrl) {
    ctx.response.set(
      "Link",
      `<${options.markdownUrl}>; rel="alternate"; type="text/markdown"`
    );
  }

  // Ensure no caching is performed
  ctx.response.set("Cache-Control", "no-cache, must-revalidate");
  ctx.response.set("Expires", "-1");

  // Replacer functions prevent "$" sequences in user content being expanded.
  ctx.body = page
    .toString()
    .replace(/\{env\}/g, () => environment)
    .replace(/\{lang\}/g, unicodeCLDRtoISO639(env.DEFAULT_LANGUAGE))
    .replace(/\{title\}/g, () => escape(title))
    .replace(/\{description\}/g, () => escape(description))
    .replace(/\{content\}/g, () => content)
    .replace(/\{cdn-url\}/g, env.CDN_URL || "")
    .replace(/\{head-tags\}/g, () => headTags)
    .replace(/\{slack-app-id\}/g, env.public.SLACK_APP_ID || "")
    .replace(/\{script-tags\}/g, scriptTags)
    .replace(/\{csp-nonce\}/g, ctx.state.cspNonce);
};

export const renderShare = async (ctx: Context, next: Next) => {
  const rootShareId = ctx.state?.rootShare?.id;
  const shareId = rootShareId ?? ctx.params.shareId;
  const collectionSlug = ctx.params.collectionSlug;
  const documentSlug = ctx.params.documentSlug;

  // The response depends on the Accept header, caches must key on it.
  ctx.vary("Accept");

  // Find the share record if published so that the document title can be returned
  // in the server-rendered HTML. This allows it to appear in unfurls more reliably.
  let share, collection, document, team;
  const isBot = isbot(ctx.get("user-agent"));
  let analytics: Integration<IntegrationType.Analytics>[] = [];

  let sharedTree;
  try {
    team = await getTeamFromContext(ctx, { includeOAuthState: false });
    const result = await loadPublicShare({
      id: shareId,
      collectionId: collectionSlug,
      documentId: documentSlug,
      teamId: team?.id,
    });
    share = result.share;
    collection = result.collection;
    document = result.document;
    sharedTree = result.sharedTree;

    if (isUUID(shareId) && share?.urlId) {
      // Redirect temporarily because the url slug
      // can be modified by the user at any time
      ctx.redirect(share.canonicalUrl);
      ctx.status = 307;
      return;
    }

    analytics = await Integration.findAnalyticsIntegrationsForTeam(
      share.teamId
    );

    if (share && !isBot) {
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

  // The markdown representation lives at the same path with a .md suffix, only
  // on the routes that accept a format suffix.
  const markdownPath = ctx.params.shareId
    ? `/s/${ctx.params.shareId}${documentSlug ? `/doc/${documentSlug}` : ""}`
    : undefined;
  const markdownUrl =
    markdownPath && markdownPath === ctx.request.path
      ? `${ctx.request.URL.origin}${markdownPath}.md`
      : undefined;

  // If the client explicitly requests markdown and prefers it over HTML,
  // or the URL path ends with .md, return the document as markdown. This is
  // useful for LLMs and API clients.
  const acceptHeader = ctx.request.headers.accept || "";
  const prefersMarkdown =
    ctx.params.format === "md" ||
    (acceptHeader.includes("text/markdown") &&
      ctx.accepts("text/markdown", "text/html") === "text/markdown");

  if (prefersMarkdown && (document || collection)) {
    let markdown = await DocumentHelper.toMarkdown(document || collection!, {
      includeTitle: true,
      signedUrls: 86400, // 24 hours
      teamId: share?.teamId,
      commonMark: true,
    });

    // Append child documents list if the share includes them
    if (share?.includeChildDocuments && sharedTree) {
      const node = document
        ? (collection?.getDocumentTree(document.id) ?? sharedTree)
        : sharedTree;

      if (node?.children?.length) {
        markdown += formatChildDocumentsAsMarkdown(
          node.children,
          share.canonicalUrl
        );
      }
    }

    ctx.type = "text/markdown";
    ctx.response.set("Cache-Control", "no-cache, must-revalidate");
    ctx.response.set("Expires", "-1");
    ctx.body = markdown;
    return;
  }

  // Allow shares to be embedded in iframes on other websites unless prevented by team preference
  const preventEmbedding =
    team?.getPreference(TeamPreference.PreventDocumentEmbedding) ?? false;
  if (!preventEmbedding) {
    allowFraming(ctx);
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

  const avatarUrl =
    publicBranding && team?.avatarUrl
      ? ((await team.publicAvatarUrl()) ?? undefined)
      : undefined;

  // Only bots read the server-rendered content, so skip the render for others.
  const model = document || collection;
  const content = model && isBot ? await renderShareContent(model) : undefined;

  const canonicalUrl = share
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
    shortcutIcon: avatarUrl,
    image: avatarUrl ? new URL(avatarUrl, env.URL).toString() : undefined,
    siteName: publicBranding && team?.name ? team.name : undefined,
    analytics,
    isShare: true,
    rootShareId,
    canonical: canonicalUrl,
    allowIndexing: share?.allowIndexing,
    markdownUrl: document || collection ? markdownUrl : undefined,
  });
};
