// @flow
import { subDays } from "date-fns";
import debug from "debug";
import Router from "koa-router";
import { documentPermanentDeleter } from "../commands/documentPermanentDeleter";
import { AuthenticationError } from "../errors";
import { Document } from "../models";
import { Op } from "../sequelize";

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

  const countDeletedDocument = await documentPermanentDeleter(documents, log);

  log(`Destroyed ${countDeletedDocument} documents`);

  ctx.body = {
    success: true,
  };
});

export default router;
