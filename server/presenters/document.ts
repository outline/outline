import { Attachment, Document } from "@server/models";
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
  options: Options | null | undefined
) {
  options = {
    isPublic: false,
    ...options,
  };
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'migrateVersion' does not exist on type '... Remove this comment to see the full error message
  await document.migrateVersion();
  const text = options.isPublic
    ? // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type 'Document'.
      await replaceImageAttachments(document.text)
    : // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type 'Document'.
      document.text;
  const data = {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
    id: document.id,
    // @ts-expect-error ts-migrate(2551) FIXME: Property 'url' does not exist on type 'Document'. ... Remove this comment to see the full error message
    url: document.url,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'urlId' does not exist on type 'Document'... Remove this comment to see the full error message
    urlId: document.urlId,
    title: document.title,
    text,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'emoji' does not exist on type 'Document'... Remove this comment to see the full error message
    emoji: document.emoji,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'tasks' does not exist on type 'Document'... Remove this comment to see the full error message
    tasks: document.tasks,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'Docum... Remove this comment to see the full error message
    createdAt: document.createdAt,
    createdBy: undefined,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'updatedAt' does not exist on type 'Docum... Remove this comment to see the full error message
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'publishedAt' does not exist on type 'Doc... Remove this comment to see the full error message
    publishedAt: document.publishedAt,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'archivedAt' does not exist on type 'Docu... Remove this comment to see the full error message
    archivedAt: document.archivedAt,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'deletedAt' does not exist on type 'Docum... Remove this comment to see the full error message
    deletedAt: document.deletedAt,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'teamId' does not exist on type 'Document... Remove this comment to see the full error message
    teamId: document.teamId,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'template' does not exist on type 'Docume... Remove this comment to see the full error message
    template: document.template,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'templateId' does not exist on type 'Docu... Remove this comment to see the full error message
    templateId: document.templateId,
    collaboratorIds: [],
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'starred' does not exist on type 'Documen... Remove this comment to see the full error message
    starred: document.starred ? !!document.starred.length : undefined,
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'revisionCount' does not exist on type 'D... Remove this comment to see the full error message
    revision: document.revisionCount,
    pinned: undefined,
    collectionId: undefined,
    parentDocumentId: undefined,
    lastViewedAt: undefined,
  };

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'views' does not exist on type 'Document'... Remove this comment to see the full error message
  if (!!document.views && document.views.length > 0) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'views' does not exist on type 'Document'... Remove this comment to see the full error message
    data.lastViewedAt = document.views[0].updatedAt;
  }

  if (!options.isPublic) {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'undefine... Remove this comment to see the full error message
    data.pinned = !!document.pinnedById;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'collectionId' does not exist on type 'Do... Remove this comment to see the full error message
    data.collectionId = document.collectionId;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'parentDocumentId' does not exist on type... Remove this comment to see the full error message
    data.parentDocumentId = document.parentDocumentId;
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'UserPresentation | null | undefined' is not ... Remove this comment to see the full error message
    data.createdBy = presentUser(document.createdBy);
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'UserPresentation | null | undefined' is not ... Remove this comment to see the full error message
    data.updatedBy = presentUser(document.updatedBy);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'collaboratorIds' does not exist on type ... Remove this comment to see the full error message
    data.collaboratorIds = document.collaboratorIds;
  }

  return data;
}
