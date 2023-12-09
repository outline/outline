import stream from "stream";
import { Context, Next } from "koa";
import { Readable } from "readable-stream";

export default function apiResponse() {
  return async function apiResponseMiddleware(ctx: Context, next: Next) {
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
