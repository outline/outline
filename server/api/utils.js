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

  log(`Permanently destroying upto ${limit} documents older than 30 days…`);

  const documents = await Document.scope("withUnpublished").findAll({
    attributes: ["id", "teamId", "text"],
    where: {
      deletedAt: {
        [Op.lt]: subDays(new Date(), 30),
      },
    },
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
        const attachment = await Attachment.findOne({
          where: {
            teamId: document.teamId,
            id: attachmentId,
          },
        });

        if (attachment) {
          await attachment.destroy();

          log(`Attachment ${attachmentId} deleted`);
        } else {
          log(`Unknown attachment ${attachmentId} ignored`);
        }
      }
    }
  }

  await Document.scope("withUnpublished").destroy({
    where: {
      id: documents.map((document) => document.id),
    },
    force: true,
  });

  log(`Destroyed ${documents.length} documents`);

  ctx.body = {
    success: true,
  };
});

export default router;
