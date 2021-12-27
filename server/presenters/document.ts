import { Document } from "@server/models";
import Attachment from "@server/models/Attachment";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import { getSignedUrl } from "@server/utils/s3";
import presentUser from "./user";

type Options = {
  isPublic?: boolean;
};

// replaces attachments.redirect urls with signed/authenticated url equivalents
async function replaceImageAttachments(text: string) {
  const attachmentIds = parseAttachmentIds(text);
  await Promise.all(
    attachmentIds.map(async (id) => {
      const attachment = await Attachment.findByPk(id);

      if (attachment) {
        const accessUrl = await getSignedUrl(attachment.key);
        text = text.replace(attachment.redirectUrl, accessUrl);
      }
    })
  );

  return text;
}

export default async function present(
  document: Document,
  options: Options | null | undefined = {}
) {
  options = {
    isPublic: false,
    ...options,
  };
  await document.migrateVersion();
  const text = options.isPublic
    ? await replaceImageAttachments(document.text)
    : document.text;
  const data = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
    text,
    emoji: document.emoji,
    tasks: document.tasks,
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
    fullWidth: document.fullWidth,
    collectionId: undefined,
    parentDocumentId: undefined,
    lastViewedAt: undefined,
  };

  if (!!document.views && document.views.length > 0) {
    data.lastViewedAt = document.views[0].updatedAt;
  }

  if (!options.isPublic) {
    data.collectionId = document.collectionId;
    data.parentDocumentId = document.parentDocumentId;
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'UserPresentation | null | undefined' is not ... Remove this comment to see the full error message
    data.createdBy = presentUser(document.createdBy);
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'UserPresentation | null | undefined' is not ... Remove this comment to see the full error message
    data.updatedBy = presentUser(document.updatedBy);
    data.collaboratorIds = document.collaboratorIds;
  }

  return data;
}
