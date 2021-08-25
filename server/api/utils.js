// @flow
import { subDays } from "date-fns";
import debug from "debug";
import Router from "koa-router";
import { documentPermanentDeleter } from "../commands/documentPermanentDeleter";
import { AuthenticationError } from "../errors";
import { Document, FileOperation } from "../models";
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
    attributes: ["id", "teamId", "text", "deletedAt"],
    where: {
      deletedAt: {
        [Op.lt]: subDays(new Date(), 30),
      },
    },
    paranoid: false,
    limit,
  });

  const countDeletedDocument = await documentPermanentDeleter(documents);

  log(`Destroyed ${countDeletedDocument} documents`);

  log(`Expiring all the collection export older than 30 days…`);

  const exports = await FileOperation.unscoped().findAll({
    where: {
      type: "export",
      createdAt: {
        [Op.lt]: subDays(new Date(), 30),
      },
      state: {
        [Op.ne]: "expired",
      },
    },
  });

  await Promise.all(
    exports.map(async (e) => {
      await e.expire();
    })
  );

  ctx.body = {
    success: true,
  };
});

export default router;
