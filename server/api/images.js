// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { Attachment } from '../models';
import { getSignedImageUrl } from '../utils/s3';

const router = new Router();

router.post('images.info', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const attachment = await Attachment.findByPk(id);
  const redirectUrl =
    attachment.acl === 'private'
      ? await getSignedImageUrl(attachment.key)
      : attachment.url;
  ctx.redirect(redirectUrl);
});

export default router;
