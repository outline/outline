import stream from "stream";
import { Context } from "koa";

export default function apiWrapper() {
  return async function apiWrapperMiddleware(
    ctx: Context,
    next: () => Promise<any>
  ) {
    await next();
    const ok = ctx.status < 400;

    if (
      typeof ctx.body !== "string" &&
      !(ctx.body instanceof stream.Readable)
    ) {
      ctx.body = {
        ...ctx.body,
        status: ctx.status,
        ok,
      };
    }
  };
}
