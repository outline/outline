import stream from "stream";
import { Context, Next } from "koa";
import { Readable } from "readable-stream";
import { addTags } from "@server/logging/tracer";

export default function apiWrapper() {
  return async function apiWrapperMiddleware(ctx: Context, next: Next) {
    const id = ctx.request.body?.id ?? ctx.request.query?.id;
    if (id) {
      addTags({
        "resource.id": `${id}`,
      });
    }

    await next();
    const ok = ctx.status < 400;

    if (
      typeof ctx.body === "object" &&
      !(ctx.body instanceof Readable) &&
      !(ctx.body instanceof stream.Readable) &&
      !(ctx.body instanceof Buffer)
    ) {
      ctx.body = {
        ...ctx.body,
        status: ctx.status,
        ok,
      };
    }
  };
}
