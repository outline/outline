import type { Next } from "koa";
import type { AppContext } from "@server/types";

export default function apexRedirect() {
  return async function apexRedirectMiddleware(ctx: AppContext, next: Next) {
    if (ctx.headers.host === "getoutline.com") {
      ctx.redirect(`https://www.${ctx.headers.host}${ctx.path}`);
    } else {
      return next();
    }
  };
}
