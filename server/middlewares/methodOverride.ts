import { Context, Next } from "koa";
import queryString from "query-string";

export default function methodOverride() {
  return async function methodOverrideMiddleware(ctx: Context, next: Next) {
    if (ctx.method === "POST") {
      ctx.body = ctx.request.body;
    } else if (ctx.method === "GET") {
      ctx.method = 'POST'; // eslint-disable-line

      ctx.body = queryString.parse(ctx.querystring);
    }

    return next();
  };
}
