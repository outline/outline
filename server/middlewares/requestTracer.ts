import { Context, Next } from "koa";
import { addTags, getRootSpanFromRequestContext } from "@server/logging/tracer";

export default function requestTracer() {
  return async function requestTracerMiddleware(ctx: Context, next: Next) {
    const params = ctx.request.body ?? ctx.request.query;

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
