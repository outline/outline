import path from 'path';
import fs from 'fs';
import httpErrors from 'http-errors';
import Koa from 'koa';
import Router from 'koa-router';
import sendfile from 'koa-sendfile';
import subdomainRedirect from './middlewares/subdomainRedirect';

const koa = new Koa();
const router = new Router();

const readFile = src => {
  return new Promise((resolve, reject) => {
    fs.readFile(src, { encoding: 'utf8' }, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
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

  router.get('/', async ctx => {
    const html = await readFile(path.join(__dirname, '../dist/index.html'));
    ctx.body = html;

    if (!ctx.status) ctx.throw(httpErrors.NotFound());
  });

  router.get('*', async ctx => {
    await sendfile(ctx, path.join(__dirname, '../dist/index.html'));
    if (!ctx.status) ctx.throw(httpErrors.NotFound());
  });

  koa.use(subdomainRedirect());
} else {
  router.get('*', async ctx => {
    console.log(ctx.cookies.get('loggedIn'));
    const html = await readFile(path.join(__dirname, './static/dev.html'));
    ctx.body = html;

    if (!ctx.status) ctx.throw(httpErrors.NotFound());
  });
}

koa.use(router.routes());

// 404 handler
koa.use(async () => {
  throw httpErrors.NotFound();
});

export default koa;
