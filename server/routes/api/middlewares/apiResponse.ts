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
      !(ctx.body instanceof Buffer) &&
      // JSZip returns a wrapped stream instance that is not a true readable stream
      // and not exported from the module either, so we must identify it like so.
      !(ctx.body && "_readableState" in ctx.body)
    ) {
      ctx.body = {
        ...ctx.body,
        status: ctx.status,
        ok,
      };
    }
  };
}
