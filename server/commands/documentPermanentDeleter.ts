import { chunk, uniq } from "es-toolkit/compat";
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

  // Number of documents to delete per database statement. Keeps the exclusive
  // lock window short enough to avoid blocking concurrent web requests that
  // read from the documents table.
  const BATCH_SIZE = 100;

  const documentIds = documents.map((document) => document.id);

  // Re-check deletedAt in the database to exclude documents that were restored
  // between the caller's query and now. Otherwise the parentDocumentId clear
  // below would detach children of a restored parent, breaking the hierarchy.
  const stillDeleted = await Document.unscoped().findAll({
    attributes: ["id"],
    where: {
      id: documentIds,
      deletedAt: { [Op.ne]: null },
    },
    paranoid: false,
  });
  const deletedIds = stillDeleted.map((document) => document.id);
  const batches = chunk(deletedIds, BATCH_SIZE);

  for (const batch of batches) {
    await Document.update(
      {
        parentDocumentId: null,
      },
      {
        where: {
          parentDocumentId: {
            [Op.in]: batch,
          },
        },
        paranoid: false,
      }
    );
  }

  let totalDeleted = 0;
  for (const batch of batches) {
    totalDeleted += await Document.scope("withDrafts").destroy({
      where: {
        id: batch,
        deletedAt: { [Op.ne]: null },
      },
      force: true,
    });
  }
  return totalDeleted;
}
