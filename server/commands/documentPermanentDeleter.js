// @flow
import Logger from "../logging/logger";
import { Document, Attachment } from "../models";
import { sequelize } from "../sequelize";
import parseAttachmentIds from "../utils/parseAttachmentIds";

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
    const attachmentIds = parseAttachmentIds(document.text);

    for (const attachmentId of attachmentIds) {
      const [{ count }] = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          documentId: document.id,
          teamId: document.teamId,
          query: attachmentId,
        },
      });

      if (parseInt(count) === 0) {
        const attachment = await Attachment.findOne({
          where: {
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
      id: documents.map((document) => document.id),
    },
    force: true,
  });
}
