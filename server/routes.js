const path = require('path');
import httpErrors from 'http-errors';
import Koa from 'koa';
import Router from 'koa-router';
import sendfile from 'koa-sendfile';

import subdomainRedirect from './middlewares/subdomainRedirect';

const koa = new Koa();
const router = new Router();

// // error handler
// koa.use(async (ctx, next) => {
//   try {
//     await next();
//   } catch (err) {
//     ctx.status = err.status || 500;
//     ctx.body = err.message;
//   }
// });

if (process.env.NODE_ENV === 'production') {
  router.get('/service-worker.js', async (ctx) => {
    ctx.set('Content-Type', 'application/javascript');
    ctx.set('Cache-Control', `max-age=${30}`);
    const stats = await sendfile(ctx, path.join(__dirname, './static/service-worker.js'));
    if (!ctx.status) ctx.throw(httpErrors.NotFound());
  });

  router.get('/static/*', async (ctx) => {
    ctx.set({
      'Cache-Control': `max-age=${356*24*60*60}`,
    });

    const stats = await sendfile(ctx, path.join(__dirname, '../dist/', ctx.path.substring(8)));
  });

  router.get('*', async (ctx) => {
    const stats = await sendfile(ctx, path.join(__dirname, '../dist/index.html'));
    if (!ctx.status) ctx.throw(httpErrors.NotFound());
  });

  koa.use(subdomainRedirect());
} else {
  router.get('*', async (ctx) => {
    const stats = await sendfile(ctx, path.join(__dirname, './static/dev.html'));
    if (!ctx.status) ctx.throw(httpErrors.NotFound());
  });
}

koa.use(router.routes());

// 404 handler
koa.use(async () => {
  throw httpErrors.NotFound();
});

export default koa;
