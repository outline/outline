import type { Share } from "@server/models";
import { presentUser } from ".";

export default function presentShare(share: Share, isAdmin = false) {
  const data = {
    id: share.id,
    sourceTitle: share.collection?.name ?? share.document?.title,
    sourcePath: share.collection?.path ?? share.document?.path,
    collectionId: share.collectionId,
    documentId: share.documentId,
    documentTitle: share.document?.title,
    documentUrl: share.document?.url,
    published: share.published,
    url: share.canonicalUrl,
    urlId: share.urlId,
    createdBy: presentUser(share.user),
    includeChildDocuments: share.includeChildDocuments,
    allowIndexing: share.allowIndexing,
    showLastUpdated: share.showLastUpdated,
    showTOC: share.showTOC,
    lastAccessedAt: share.lastAccessedAt || undefined,
    views: share.views || 0,
    domain: share.domain,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };

  if (!isAdmin) {
    delete data.lastAccessedAt;
  }

  return data;
}
