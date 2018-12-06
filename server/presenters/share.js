// @flow
import { Share } from '../models';
import { presentUser } from '.';

function present(ctx: Object, share: Share) {
  return {
    id: share.id,
    documentTitle: share.document.title,
    documentUrl: share.document.url,
    url: `${process.env.URL}/share/${share.id}`,
    createdBy: presentUser(ctx, share.user),
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}

export default present;
