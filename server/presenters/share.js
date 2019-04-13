// @flow
import { Share } from '../models';
import { presentUser } from '.';

export default function present(share: Share) {
  return {
    id: share.id,
    documentTitle: share.document.title,
    documentUrl: share.document.url,
    url: `${process.env.URL}/share/${share.id}`,
    createdBy: presentUser(share.user),
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}
