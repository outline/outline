import stream from "node:stream";
import type { Next } from "koa";
import { Readable } from "readable-stream";
import type { AppContext } from "@server/types";

export default function apiResponse() {
  return async function apiResponseMiddleware(ctx: AppContext, next: Next) {
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
