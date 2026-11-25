import type { Next } from "koa";
import { addTags, getRootSpanFromRequestContext } from "@server/logging/tracer";
import { RequestHelper } from "@server/utils/RequestHelper";
import type { AppContext } from "@server/types";

export default function requestTracer() {
  return async function requestTracerMiddleware(ctx: AppContext, next: Next) {
    const params = ctx.request.body
      ? RequestHelper.getBodyObject(ctx.request)
      : ctx.request.query;

    for (const key in params) {
      if (key === "id" || key.endsWith("Id")) {
        const value = params[key];
        if (typeof value === "string") {
          addTags(
            {
              [`resource.${key}`]: value,
            },
            getRootSpanFromRequestContext(ctx)
          );
        }
      }
    }

    await next();
  };
}
