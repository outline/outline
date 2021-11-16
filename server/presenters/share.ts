import { Share } from "../models";
import { presentUser } from ".";

// @ts-expect-error ts-migrate(2749) FIXME: 'Share' refers to a value, but is being used as a ... Remove this comment to see the full error message
export default function present(share: Share, isAdmin = false) {
  const data = {
    id: share.id,
    documentId: share.documentId,
    documentTitle: share.document.title,
    documentUrl: share.document.url,
    published: share.published,
    url: `${share.team.url}/share/${share.id}`,
    createdBy: presentUser(share.user),
    includeChildDocuments: share.includeChildDocuments,
    lastAccessedAt: share.lastAccessedAt,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };

  if (!isAdmin) {
    delete data.lastAccessedAt;
  }

  return data;
}
