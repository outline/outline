// @flow
import * as React from 'react';
import path from 'path';
import Koa from 'koa';
import Router from 'koa-router';
import sendfile from 'koa-sendfile';
import serve from 'koa-static';
import parseDomain from 'parse-domain';
import apexRedirect from './middlewares/apexRedirect';
import renderpage from './utils/renderpage';
import { robotsResponse } from './utils/robots';
import { NotFoundError } from './errors';
import { Team } from './models';

import Home from './pages/Home';
import About from './pages/About';
import Changelog from './pages/Changelog';
import Privacy from './pages/Privacy';
import Pricing from './pages/Pricing';
import Api from './pages/Api';
import SubdomainSignin from './pages/SubdomainSignin';

const isProduction = process.env.NODE_ENV === 'production';
const koa = new Koa();
const router = new Router();

const renderapp = async ctx => {
  if (isProduction) {
    await sendfile(ctx, path.join(__dirname, '../dist/index.html'));
  } else {
    await sendfile(ctx, path.join(__dirname, './static/dev.html'));
  }
};

// serve static assets
koa.use(serve(path.resolve(__dirname, '../public')));

router.get('/_health', ctx => (ctx.body = 'OK'));

if (process.env.NODE_ENV === 'production') {
  router.get('/static/*', async ctx => {
    ctx.set({
      'Cache-Control': `max-age=${356 * 24 * 60 * 60}`,
    });

    await sendfile(
      ctx,
      path.join(__dirname, '../dist/', ctx.path.substring(8))
    );
  });
}

// static pages
router.get('/about', ctx => renderpage(ctx, <About />));
router.get('/pricing', ctx => renderpage(ctx, <Pricing />));
router.get('/developers', ctx => renderpage(ctx, <Api />));
router.get('/privacy', ctx => renderpage(ctx, <Privacy />));
router.get('/changelog', async ctx => {
  const data = await fetch(
    'https://api.github.com/repos/outline/outline/releases'
  );
  const releases = await data.json();
  return renderpage(ctx, <Changelog releases={releases} />);
});

// home page
router.get('/', async ctx => {
  const lastSignedIn = ctx.cookies.get('lastSignedIn');
  const accessToken = ctx.cookies.get('accessToken');
  const domain = parseDomain(ctx.request.hostname);
  const subdomain = domain ? domain.subdomain : false;

  if (accessToken) {
    return renderapp(ctx);
  }

  if (subdomain) {
    const team = await Team.find({
      where: { subdomain },
    });
    if (team && process.env.SUBDOMAINS_ENABLED) {
      return renderpage(
        ctx,
        <SubdomainSignin
          team={team}
          notice={ctx.request.query.notice}
          lastSignedIn={lastSignedIn}
          googleSigninEnabled={!!process.env.GOOGLE_CLIENT_ID}
          slackSigninEnabled={!!process.env.SLACK_KEY}
          hostname={ctx.request.hostname}
        />
      );
    }

    ctx.redirect(`${process.env.URL}?notice=invalid-auth`);
    return;
  }

  return renderpage(
    ctx,
    <Home
      notice={ctx.request.query.notice}
      lastSignedIn={lastSignedIn}
      googleSigninEnabled={!!process.env.GOOGLE_CLIENT_ID}
      slackSigninEnabled={!!process.env.SLACK_KEY}
    />
  );
});

// Other
router.get('/robots.txt', ctx => (ctx.body = robotsResponse(ctx)));

// catch all for react app
router.get('*', async ctx => {
  await renderapp(ctx);
  if (!ctx.status) ctx.throw(new NotFoundError());
});

// middleware
koa.use(apexRedirect());
koa.use(router.routes());

export default koa;
