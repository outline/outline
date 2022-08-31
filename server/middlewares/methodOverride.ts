import { Context, Next } from "koa";
import queryString from "query-string";

export default function methodOverride() {
  return async function methodOverrideMiddleware(ctx: Context, next: Next) {
    // TODO: Need to remove this use of ctx.body to enable proper typing of requests
    if (ctx.method === "POST") {
      ctx.body = ctx.request.body;
    } else if (ctx.method === "GET") {
      ctx.body = queryString.parse(ctx.querystring);
    }

    return next();
  };
}
