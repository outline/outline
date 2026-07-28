import type { Share } from "@server/models";
import { presentUser } from ".";

interface Options {
  /** Whether the viewer is an admin of the team that owns the share. */
  isAdmin?: boolean;
  /** Whether the share is presented to a viewer without access to it. */
  isPublic?: boolean;
}

/**
 * Serializes a share for the API.
 *
 * @param share the share to present.
 * @param options options controlling which fields are included.
 * @returns the serialized share.
 */
export default function presentShare(share: Share, options: Options = {}) {
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
    ...(options.isPublic || !share.user
      ? {}
      : { createdBy: presentUser(share.user) }),
    includeChildDocuments: share.includeChildDocuments,
    allowIndexing: share.allowIndexing,
    allowSubscriptions: share.allowSubscriptions,
    showLastUpdated: share.showLastUpdated,
    showTOC: share.showTOC,
    title: share.title,
    iconUrl: share.iconUrl,
    lastAccessedAt: share.lastAccessedAt || undefined,
    views: share.views || 0,
    domain: share.domain,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };

  if (!options.isAdmin) {
    delete data.lastAccessedAt;
  }

  return data;
}
