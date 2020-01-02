// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { getSignedImageUrl } from '../utils/s3';

const router = new Router();

router.post('images.info', auth(), async ctx => {
  const { key } = ctx.body;
  const url = await getSignedImageUrl(key);
  ctx.redirect(url);
});

export default router;
