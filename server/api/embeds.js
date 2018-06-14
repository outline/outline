// @flow
import Router from 'koa-router';
import scrape from 'html-metadata';

const router = new Router();

router.post('embeds.metadata', async ctx => {
  const { url } = ctx.body;
  ctx.assertPresent(url, 'url is required');

  // TODO: cache
  const metadata = await scrape(url);

  ctx.body = {
    data: {
      url,
      metadata,
    },
  };
});

export default router;
