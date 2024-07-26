import escape from "escape-html";
import { Context, Next } from "koa";
import env from "@server/env";

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
    ctx.throw(400, "url is required");
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    ctx.throw(400, "Invalid URL provided");
  }

  if (
    parsed.host === "gitlab.com" &&
    parsed.protocol === "https:" &&
    ctx.path === "/embeds/gitlab"
  ) {
    const snippetLink = `${url}.js`;
    const csp = ctx.response.get("Content-Security-Policy");

    // Inject gitlab.com into the script-src and style-src directives
    ctx.set(
      "Content-Security-Policy",
      csp
        .replace("script-src", "script-src gitlab.com")
        .replace("style-src", "style-src gitlab.com")
    );
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

  if (
    parsed.host === "gist.github.com" &&
    parsed.protocol === "https:" &&
    ctx.path === "/embeds/github"
  ) {
    const id = parsed.pathname.split("/")[2];
    const gistLink = `https://gist.github.com/${id}.js`;
    const csp = ctx.response.get("Content-Security-Policy");

    // Inject GitHub domains into the script-src and style-src directives
    ctx.set(
      "Content-Security-Policy",
      csp
        .replace("script-src", "script-src gist.github.com")
        .replace("style-src", "style-src github.githubassets.com")
    );
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
    const csp = ctx.response.get("Content-Security-Policy");

    // Inject Dropbox domain into the script-src directive
    ctx.set(
      "Content-Security-Policy",
      csp.replace("script-src", "script-src www.dropbox.com")
    );
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

  return next();
};
