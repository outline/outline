// @flow
import { Share } from '../models';
import { presentUser } from '.';

function present(ctx: Object, share: Share) {
  return {
    id: share.id,
    user: presentUser(ctx, share.user),
    documentTitle: share.document.title,
    url: `${process.env.URL}/share/${share.id}`,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}

export default present;
