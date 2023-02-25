import { Next } from "koa";
import { AppContext } from "@server/types";

// remove after https://github.com/koajs/koa-body/issues/218 is resolved
export default function coalesceBody() {
  return function coalesceBodyMiddleware(ctx: AppContext, next: Next) {
    if (!ctx.request.body) {
      ctx.request.body = {};
    }
    return next();
  };
}
