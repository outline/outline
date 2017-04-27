export default function subdomainRedirect(options) {
  return async function subdomainRedirectMiddleware(ctx, next) {
    if (ctx.headers.host === 'beautifulatlas.com') {
      ctx.redirect('https://www.' + ctx.headers.host + ctx.path);
    } else {
      return next();
    }
  };
}
