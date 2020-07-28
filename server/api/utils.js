// @flow
import debug from "debug";
import Router from "koa-router";
import subDays from "date-fns/sub_days";
import { AuthenticationError } from "../errors";
import { Document, Attachment } from "../models";
import { Op } from "../sequelize";

const router = new Router();
const log = debug("utils");

router.post("utils.gc", async ctx => {
  const { token } = ctx.body;

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
    attributes: ["id"],
    where,
  });
  const documentIds = documents.map(d => d.id);

  await Attachment.destroy({
    where: {
      documentId: documentIds,
    },
  });

  await Document.scope("withUnpublished").destroy({
    where,
    force: true,
  });

  log(`Deleted ${documentIds.length} documents`);

  ctx.body = {
    success: true,
  };
});

export default router;
