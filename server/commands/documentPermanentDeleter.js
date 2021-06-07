// @flow
import debug from "debug";
import { Document, Attachment } from "../models";
import { sequelize } from "../sequelize";
import parseAttachmentIds from "../utils/parseAttachmentIds";

export async function documentPermanentDeleter(
  documents: Document[],
  log?: debug.Debugger
) {
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

          log && log(`Attachment ${attachmentId} deleted`);
        } else {
          log && log(`Unknown attachment ${attachmentId} ignored`);
        }
      }
    }
  }

  const countDeletedDocument = await Document.scope("withUnpublished").destroy({
    where: {
      id: documents.map((document) => document.id),
    },
    force: true,
  });

  return countDeletedDocument;
}
