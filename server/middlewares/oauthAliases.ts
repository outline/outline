import type { Context, Next } from "koa";

const ALIASES: Record<string, string> = {
  "/authorize": "/oauth/authorize",
  "/token": "/oauth/token",
  "/register": "/oauth/register",
  "/revoke": "/oauth/revoke",
};

/**
 * Maps the unprefixed OAuth paths some MCP clients construct (e.g.
 * `<host>/authorize` instead of the canonical `/oauth/authorize` advertised
 * in the OAuth 2.0 authorization-server metadata) onto Outline's existing
 * /oauth/* routes.
 *
 * GET requests are 302-redirected so the browser's URL bar reflects the
 * canonical path and the consent SPA route matches. Other methods rewrite
 * `ctx.url` in place so existing handlers serve them transparently.
 */
export default function oauthAliases() {
  return async function oauthAliasesMiddleware(ctx: Context, next: Next) {
    const target = ALIASES[ctx.path];
    if (!target) {
      return next();
    }
    if (ctx.method === "GET") {
      ctx.redirect(`${target}${ctx.search}`);
      return;
    }
    ctx.url = ctx.url.replace(ctx.path, target);
    return next();
  };
}
