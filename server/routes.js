import React from 'react';
import path from 'path';
import fs from 'fs';
import httpErrors from 'http-errors';
import Koa from 'koa';
import Router from 'koa-router';
import sendfile from 'koa-sendfile';
import ReactDOMServer from 'react-dom/server';
import subdomainRedirect from './middlewares/subdomainRedirect';
import { Helmet } from 'react-helmet';

import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import Layout from './pages/components/Layout';
import Home from './pages/Home';

const isProduction = process.env.NODE_ENV === 'production';
const koa = new Koa();
const router = new Router();
const sheet = new ServerStyleSheet();

const readFile = src => {
  return new Promise((resolve, reject) => {
    fs.readFile(src, { encoding: 'utf8' }, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
};

const renderPage = children => {
  const html = ReactDOMServer.renderToString(
    <StyleSheetManager sheet={sheet.instance}>
      <Layout>
        {children}
      </Layout>
    </StyleSheetManager>
  );

  // helmet returns an object of meta tags with toString methods, urgh.
  const helmet = Helmet.renderStatic();
  let head = '';
  Object.keys(helmet).forEach(key => (head += helmet[key].toString()));

  return html
    .replace('{{CSS}}', sheet.getStyleTags())
    .replace('{{HEAD}}', head);
};

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

router.get('/', async ctx => {
  if (ctx.cookies.get('loggedIn')) {
    if (isProduction) {
      ctx.body = await readFile(path.join(__dirname, '../dist/index.html'));
    } else {
      ctx.body = await readFile(path.join(__dirname, './static/dev.html'));
    }
  } else {
    ctx.body = await renderPage(<Home />);
  }

  if (!ctx.status) ctx.throw(httpErrors.NotFound());
});

router.get('*', async ctx => {
  if (isProduction) {
    ctx.body = await readFile(path.join(__dirname, '../dist/index.html'));
  } else {
    ctx.body = await readFile(path.join(__dirname, './static/dev.html'));
  }
  if (!ctx.status) ctx.throw(httpErrors.NotFound());
});

koa.use(subdomainRedirect());
koa.use(router.routes());

// 404 handler
koa.use(async () => {
  throw httpErrors.NotFound();
});

export default koa;
