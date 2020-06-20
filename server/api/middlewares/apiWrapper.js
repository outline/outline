// @flow
import stream from "stream";
import { type Context } from "koa";

export default function apiWrapper() {
  return async function apiWrapperMiddleware(
    ctx: Context,
    next: () => Promise<*>
  ) {
    await next();

    const ok = ctx.status < 400;

    if (
      typeof ctx.body !== "string" &&
      !(ctx.body instanceof stream.Readable)
    ) {
      // $FlowFixMe
      ctx.body = {
        ...ctx.body,
        status: ctx.status,
        ok,
      };
    }
  };
}
