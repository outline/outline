// @flow
import type { Context } from 'koa';

export default function ldapReverseProxy() {
  const logoutURL = process.env.LDAP_LOGOUT_URL || '';
  return async function ldapReverseProxyMiddleware(
    ctx: Context,
    next: () => Promise<*>
  ) {
    if (logoutURL !== '' && ctx.request.query.done) {
      ctx.redirect(logoutURL);
    } else if (
      ctx.headers[process.env.LDAP_REVERSE_PROXY_HEADER.toLocaleLowerCase()]
    ) {
      const user =
        ctx.headers[process.env.LDAP_REVERSE_PROXY_HEADER.toLocaleLowerCase()];
      ctx.redirect('/auth/ldap.callback?name=' + user + '&pass=irrelevant');
    }
    return next();
  };
}
