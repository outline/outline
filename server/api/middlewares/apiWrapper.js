export default function apiWrapper(_options) {
  return async function apiWrapperMiddleware(ctx, next) {
    await next();

    const success = ctx.status < 400;

    ctx.body = {
      ...ctx.body,
      success,
    };
  };
}
