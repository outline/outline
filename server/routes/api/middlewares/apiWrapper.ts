import stream from "stream";
import { Context, Next } from "koa";

export default function apiWrapper() {
  return async function apiWrapperMiddleware(ctx: Context, next: Next) {
    await next();
    const ok = ctx.status < 400;

    if (
      typeof ctx.body === "object" &&
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
