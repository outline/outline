import uniq from "lodash/uniq";
import { Op, QueryTypes } from "sequelize";
import Logger from "@server/logging/Logger";
import { Document, Attachment } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import DeleteAttachmentTask from "@server/queues/tasks/DeleteAttachmentTask";
import { sequelize } from "@server/storage/database";

export default async function documentPermanentDeleter(documents: Document[]) {
  const activeDocument = documents.find((doc) => !doc.deletedAt);

  if (activeDocument) {
    throw new Error(
      `Cannot permanently delete ${activeDocument.id} document. Please delete it and try again.`
    );
  }

  const query = `
    SELECT COUNT(id)
    FROM documents
    WHERE "searchVector" @@ to_tsquery('english', :query) AND
    "teamId" = :teamId AND
    "id" != :documentId
  `;

  for (const document of documents) {
    // Find any attachments that are referenced in the text content
    const attachmentIdsInText = ProsemirrorHelper.parseAttachmentIds(
      DocumentHelper.toProsemirror(document)
    );

    // Find any attachments that were originally uploaded to this document
    const attachmentIdsForDocument = (
      await Attachment.findAll({
        attributes: ["id"],
        where: {
          teamId: document.teamId,
          documentId: document.id,
        },
      })
    ).map((attachment) => attachment.id);

    const attachmentIds = uniq([
      ...attachmentIdsInText,
      ...attachmentIdsForDocument,
    ]);

    await Promise.all(
      attachmentIds.map(async (attachmentId) => {
        // Check if the attachment is referenced in any other documents – this
        // is needed as it's easy to copy and paste content between documents.
        // An uploaded attachment may end up referenced in multiple documents.
        const [{ count }] = await sequelize.query<{ count: string }>(query, {
          type: QueryTypes.SELECT,
          replacements: {
            documentId: document.id,
            teamId: document.teamId,
            query: attachmentId,
          },
        });

        // If the attachment is not referenced in any other documents then
        // delete it from the database and the storage provider.
        if (parseInt(count) === 0) {
          Logger.info(
            "commands",
            `Attachment ${attachmentId} scheduled for deletion`
          );
          await new DeleteAttachmentTask().schedule({
            attachmentId,
            teamId: document.teamId,
          });
        }
      })
    );
  }

  const documentIds = documents.map((document) => document.id);
  await Document.update(
    {
      parentDocumentId: null,
    },
    {
      where: {
        parentDocumentId: {
          [Op.in]: documentIds,
        },
      },
      paranoid: false,
    }
  );

  return Document.scope("withDrafts").destroy({
    where: {
      id: documents.map((document) => document.id),
    },
    force: true,
  });
}
