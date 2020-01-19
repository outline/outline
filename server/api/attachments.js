// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { Attachment, Document } from '../models';
import { getSignedImageUrl } from '../utils/s3';

import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('attachments.redirect', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const attachment = await Attachment.findByPk(id);
  const user = ctx.state.user;
  const document = await Document.findByPk(attachment.documentId, {
    userId: user.id,
  });
  authorize(user, 'read', document);

  const accessUrl = attachment.isPrivate
    ? await getSignedImageUrl(attachment.key)
    : attachment.url;
  ctx.redirect(accessUrl);
});

export default router;
