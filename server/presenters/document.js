// @flow
import { Attachment, Document } from "../models";
import parseAttachmentIds from "../utils/parseAttachmentIds";
import { getSignedImageUrl } from "../utils/s3";
import presentUser from "./user";

type Options = {
  isPublic?: boolean,
};

// replaces attachments.redirect urls with signed/authenticated url equivalents
async function replaceImageAttachments(text: string) {
  const attachmentIds = parseAttachmentIds(text);

  for (const id of attachmentIds) {
    const attachment = await Attachment.findByPk(id);
    if (attachment) {
      const accessUrl = await getSignedImageUrl(attachment.key);
      text = text.replace(attachment.redirectUrl, accessUrl);
    }
  }

  return text;
}

export default async function present(document: Document, options: ?Options) {
  options = {
    isPublic: false,
    ...options,
  };

  await document.migrateVersion();

  let text = options.isPublic
    ? await replaceImageAttachments(document.text)
    : document.text;

  const data = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
    text,
    emoji: document.emoji,
    createdAt: document.createdAt,
    createdBy: undefined,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    publishedAt: document.publishedAt,
    archivedAt: document.archivedAt,
    deletedAt: document.deletedAt,
    teamId: document.teamId,
    template: document.template,
    templateId: document.templateId,
    collaboratorIds: [],
    starred: document.starred ? !!document.starred.length : undefined,
    revision: document.revisionCount,
    pinned: undefined,
    collectionId: undefined,
    parentDocumentId: undefined,
    lastViewedAt: undefined,
  };

  if (!!document.views && document.views.length > 0) {
    data.lastViewedAt = document.views[0].updatedAt;
  }

  if (!options.isPublic) {
    data.pinned = !!document.pinnedById;
    data.collectionId = document.collectionId;
    data.parentDocumentId = document.parentDocumentId;
    data.createdBy = presentUser(document.createdBy);
    data.updatedBy = presentUser(document.updatedBy);
    data.collaboratorIds = document.collaboratorIds;
  }

  return data;
}
