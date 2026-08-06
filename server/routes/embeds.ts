import escape from "escape-html";
import type { Context, Next } from "koa";
import { IntegrationService } from "@shared/types";
import type { IntegrationType } from "@shared/types";
import env from "@server/env";
import { InvalidRequestError } from "@server/errors";
import { allowScriptSrc, allowStyleSrc } from "@server/middlewares/csp";
import { Integration } from "@server/models";
import { getTeamFromContext } from "@server/utils/passport";

/**
 * Resize observer script that sends a message to the parent window when content is resized. Inject
 * this script into the iframe to receive resize events.
 */
const resizeObserverScript = (
  ctx: Context
) => `<script nonce="${ctx.state.cspNonce}">
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      window.parent.postMessage({ "type": "frame-resized", "value": entry.contentRect.height }, '*');
    }
  });
  resizeObserver.observe(document.body);
</script>`;

/**
 * Script that checks if the iframe is being loaded in an iframe. If it is not, it redirects to the
 * origin URL.
 */
const iframeCheckScript = (
  ctx: Context
) => `<script nonce="${ctx.state.cspNonce}">
  if (window.self === window.top) {
    window.location.href = window.location.origin;
  }
</script>`;

/**
 * Resolves whether the given host is allowed to be embedded as a GitLab
 * snippet, checking gitlab.com as well as any self-hosted GitLab instance
 * configured for the team the request belongs to.
 *
 * @param ctx The koa context.
 * @param host The host of the URL being embedded.
 * @returns The allowed host, or undefined if the host is not permitted.
 */
async function resolveGitLabHost(ctx: Context, host: string) {
  if (host === "gitlab.com") {
    return host;
  }

  const team = await getTeamFromContext(ctx);
  if (!team) {
    return undefined;
  }

  const integration = (await Integration.findOne({
    where: { teamId: team.id, service: IntegrationService.GitLab },
  })) as Integration<IntegrationType.Embed> | null;

  const customUrl = integration?.settings?.gitlab?.url;

  if (!customUrl) {
    return undefined;
  }

  try {
    return new URL(customUrl).host === host ? host : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Render an embed for a GitLab or GitHub snippet, injecting the necessary scripts to handle resizing
 * and iframe checks.
 *
 * @param ctx The koa context
 * @param next The next middleware in the stack
 * @returns The response body
 */
export const renderEmbed = async (ctx: Context, next: Next) => {
  const url = escape(String(ctx.query.url));

  if (!url) {
    ctx.throw(InvalidRequestError("url is required"));
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (_err) {
    ctx.throw(InvalidRequestError("Invalid URL provided"));
  }

  if (parsed.protocol === "https:" && ctx.path === "/embeds/gitlab") {
    const allowedHost = await resolveGitLabHost(ctx, parsed.host);

    if (allowedHost) {
      const snippetLink = `${url}.js`;

      allowScriptSrc(ctx, [allowedHost]);
      allowStyleSrc(ctx, [allowedHost]);
      ctx.set("X-Frame-Options", "sameorigin");

      ctx.type = "html";
      ctx.body = `
<html>
<head>
<style>body { margin: 0; .gitlab-embed-snippets { margin: 0; } }</style>
<base target="_parent">
${iframeCheckScript(ctx)}
</head>
<body>
<script type="text/javascript" src="${snippetLink}"></script>
${resizeObserverScript(ctx)}
</body>
`;
      return;
    }
  }

  if (
    parsed.host === "gist.github.com" &&
    parsed.protocol === "https:" &&
    ctx.path === "/embeds/github"
  ) {
    const id = parsed.pathname.split("/")[2];
    const gistLink = `https://gist.github.com/${id}.js`;

    allowScriptSrc(ctx, ["gist.github.com"]);
    allowStyleSrc(ctx, ["github.githubassets.com"]);
    ctx.set("X-Frame-Options", "sameorigin");

    ctx.type = "html";
    ctx.body = `
<html>
<head>
<style>*{ font-size:12px; } body { margin: 0; } .gist .blob-wrapper.data { max-height:300px; overflow:auto; }</style>
<base target="_parent">
${iframeCheckScript(ctx)}
</head>
<body>
<script type="text/javascript" src="${gistLink}"></script>
${resizeObserverScript(ctx)}
</body>
`;
    return;
  }

  if (
    parsed.host === "www.dropbox.com" &&
    parsed.protocol === "https:" &&
    ctx.path === "/embeds/dropbox"
  ) {
    const dropboxJs = "https://www.dropbox.com/static/api/2/dropins.js";

    allowScriptSrc(ctx, ["www.dropbox.com"]);
    ctx.set("X-Frame-Options", "sameorigin");

    ctx.type = "html";
    ctx.body = `
<html>
<head>
<style>body { margin: 0; }</style>
<base target="_parent">
${iframeCheckScript(ctx)}
</head>
<body>
<a href="${parsed}" class="dropbox-embed">
<script type="text/javascript" src="${dropboxJs}"
id="dropboxjs" data-app-key="${env.DROPBOX_APP_KEY}"></script>
${resizeObserverScript(ctx)}
</body>
`;
    return;
  }

  if (
    (parsed.host === "pinterest.com" ||
      parsed.host.endsWith(".pinterest.com")) &&
    parsed.protocol === "https:" &&
    ctx.path === "/embeds/pinterest"
  ) {
    const pinterestJs = "https://assets.pinterest.com/js/pinit.js";

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const isProfile =
      pathParts.length === 1 ||
      (pathParts.length === 2 && pathParts[1].startsWith("_"));
    const pinType = isProfile ? "embedUser" : "embedBoard";

    const pinterestSrc = ["assets.pinterest.com", "widgets.pinterest.com"];
    allowScriptSrc(ctx, pinterestSrc);
    allowStyleSrc(ctx, pinterestSrc);
    ctx.set("X-Frame-Options", "sameorigin");

    ctx.type = "html";
    ctx.body = `
<html>
<head>
<style>
  html, body, iframe {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100px;
  }
  .pinterest-container {
    width: 100%;
    max-width: 100vw;
    display: flex;
    justify-content: center;
  }

  .pinterest-container > span {
    width: 100% !important;
    max-width: none !important;
  }

  .pinterest-container iframe {
    width: 100% !important;
    max-width: none !important;
  }

  span[class*="_bd"] {
    height: 100% !important;
  }

  @media (prefers-color-scheme: dark) {
    .pinterest-container > span {
      border-color: rgb(35, 38, 41) !important;
      background-color: rgb(22, 25, 28) !important;
    }

    [class$="_pinner"],
    [class$="_board"] {
      color: #e6e6e6 !important;
    }
    [class$="_button"] {
      border-color: rgb(38, 42, 50) !important;
      background-color: rgba(3, 58, 120, 0.1) !important;
    }
  }
</style>
<base target="_parent">
${iframeCheckScript(ctx)}
</head>
<body>
<div class="pinterest-container">
  <a
    data-pin-do="${pinType}"
    data-pin-board-width="100%"
    href="${url}"
    style="width:100%;max-width:none;"
  ></a>
</div>
<script type="text/javascript" async defer src="${pinterestJs}"></script>
${resizeObserverScript(ctx)}
</body>
</html>`;
    return;
  }

  return next();
};
