// @flow
import { Share } from "../models";
import { presentUser } from ".";

export default function present(share: Share, isAdmin: boolean = false) {
  let data = {
    id: share.id,
    documentId: share.documentId,
    documentTitle: share.document.title,
    documentUrl: share.document.url,
    published: share.published,
    url: `${share.team.url}/share/${share.id}`,
    createdBy: presentUser(share.user),
    lastAccessedAt: share.lastAccessedAt,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };

  if (!isAdmin) {
    delete data.lastAccessedAt;
  }

  return data;
}
