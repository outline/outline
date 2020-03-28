// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import { Attachment, Document } from '../models';
import { getSignedImageUrl } from '../utils/s3';
import { NotFoundError } from '../errors';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('attachments.redirect', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const attachment = await Attachment.findByPk(id);
  if (!attachment) {
    throw new NotFoundError();
  }

  if (attachment.isPrivate) {
    if (attachment.documentId) {
      const document = await Document.findByPk(attachment.documentId, {
        userId: user.id,
      });
      authorize(user, 'read', document);
    }

    const accessUrl = await getSignedImageUrl(attachment.key);
    ctx.redirect(accessUrl);
  } else {
    ctx.redirect(attachment.url);
  }
});

export default router;
