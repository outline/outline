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
        // @ts-expect-error ts-migrate(2698) FIXME: Spread types may only be created from object types... Remove this comment to see the full error message
        ...ctx.body,
        status: ctx.status,
        ok,
      };
    }
  };
}
