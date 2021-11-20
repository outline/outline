import Logger from "@server/logging/logger";
import { Document, Attachment } from "@server/models";
import parseAttachmentIds from "@server/utils/parseAttachmentIds";
import { sequelize } from "../sequelize";

export default async function documentPermanentDeleter(documents: Document[]) {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'deletedAt' does not exist on type 'Docum... Remove this comment to see the full error message
  const activeDocument = documents.find((doc) => !doc.deletedAt);

  if (activeDocument) {
    throw new Error(
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type 'Document'.
    const attachmentIds = parseAttachmentIds(document.text);

    for (const attachmentId of attachmentIds) {
      const [{ count }] = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
          documentId: document.id,
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'teamId' does not exist on type 'Document... Remove this comment to see the full error message
          teamId: document.teamId,
          query: attachmentId,
        },
      });

      if (parseInt(count) === 0) {
        const attachment = await Attachment.findOne({
          where: {
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'teamId' does not exist on type 'Document... Remove this comment to see the full error message
            teamId: document.teamId,
            id: attachmentId,
          },
        });

        if (attachment) {
          await attachment.destroy();
          Logger.info("commands", `Attachment ${attachmentId} deleted`);
        } else {
          Logger.info("commands", `Unknown attachment ${attachmentId} ignored`);
        }
      }
    }
  }

  return Document.scope("withUnpublished").destroy({
    where: {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'Document'.
      id: documents.map((document) => document.id),
    },
    force: true,
  });
}
