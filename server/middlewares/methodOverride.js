// @flow
import queryString from "query-string";
import { type Context } from "koa";

export default function methodOverride() {
  return async function methodOverrideMiddleware(
    ctx: Context,
    next: () => Promise<*>
  ) {
    if (ctx.method === "POST") {
      // $FlowFixMe
      ctx.body = ctx.request.body;
    } else if (ctx.method === "GET") {
      ctx.method = 'POST'; // eslint-disable-line
      ctx.body = queryString.parse(ctx.querystring);
    }
    return next();
  };
}
