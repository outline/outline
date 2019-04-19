// @flow
import type { Context } from 'koa';

export default function ldapReverseProxy() {
  return async function ldapReverseProxyMiddleware(
    ctx: Context,
    next: () => Promise<*>
  ) {
    if (
      ctx.headers[process.env.LDAP_REVERSE_PROXY_HEADER.toLocaleLowerCase()]
    ) {
      const user =
        ctx.headers[process.env.LDAP_REVERSE_PROXY_HEADER.toLocaleLowerCase()];
      ctx.redirect('/auth/ldap.callback?name=' + user + '&pass=irrelevant');
    }
    return next();
  };
}
