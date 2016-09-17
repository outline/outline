export default function apiWrapper(_options) {
  return async function apiWrapperMiddleware(ctx, next) {
    await next();

    const ok = ctx.status < 400;

    ctx.body = {
      ...ctx.body,
      status: ctx.status,
      ok,
    };
  };
}
