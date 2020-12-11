// @flow
import subDays from "date-fns/sub_days";
import debug from "debug";
import Router from "koa-router";
import { AuthenticationError } from "../errors";
import { Document, Attachment } from "../models";
import { Op, sequelize } from "../sequelize";
import parseAttachmentIds from "../utils/parseAttachmentIds";

const router = new Router();
const log = debug("utils");

router.post("utils.gc", async (ctx) => {
  const { token, limit = 500 } = ctx.body;

  if (process.env.UTILS_SECRET !== token) {
    throw new AuthenticationError("Invalid secret token");
  }

  log("Permanently deleting documents older than 30 days…");

  const where = {
    deletedAt: {
      [Op.lt]: subDays(new Date(), 30),
    },
  };

  const documents = await Document.scope("withUnpublished").findAll({
    attributes: ["id", "teamId", "text"],
    where,
    paranoid: false,
    limit,
  });

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
        await Attachment.destroy({
          where: {
            id: attachmentId,
          },
        });

        log(`Deleted attachment ${attachmentId}`);
      }
    }
  }

  await Document.scope("withUnpublished").destroy({
    where,
    force: true,
  });

  log(`Deleted ${documents.length} documents`);

  ctx.body = {
    success: true,
  };
});

export default router;
