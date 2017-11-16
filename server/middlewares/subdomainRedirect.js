// @flow
import { type Context } from 'koa';

export default function subdomainRedirect() {
  return async function subdomainRedirectMiddleware(
    ctx: Context,
    next: () => Promise<void>
  ) {
    if (ctx.headers.host === 'getoutline.com') {
      ctx.redirect(`https://www.${ctx.headers.host}${ctx.path}`);
    } else {
      return next();
    }
  };
}
