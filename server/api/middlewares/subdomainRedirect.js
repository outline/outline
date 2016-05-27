export default function subdomainRedirect(options) {
  return async function subdomainRedirectMiddleware(ctx, next) {
    console.log(ctx.headers);

    if (ctx.headers['x-forwarded-proto'] != 'https') {
      ctx.redirect('https://' + ctx.headers.host + ctx.path);
    }
    else {
      return next();
    }
  }
};
