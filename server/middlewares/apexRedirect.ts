import { Context } from "koa";

export default function apexRedirect() {
  return async function apexRedirectMiddleware(
    ctx: Context,
    next: (() => Promise<unknown>)
  ) {
    if (ctx.headers.host === "getoutline.com") {
      ctx.redirect(`https://www.${ctx.headers.host}${ctx.path}`);
    } else {
      return next();
    }
  };
}
