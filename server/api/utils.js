// @flow
import { subDays } from "date-fns";
import debug from "debug";
import Router from "koa-router";
import { documentPermanentDeleter } from "../commands/documentPermanentDeleter";
import { AuthenticationError } from "../errors";
import { Document, Export } from "../models";
import { Op } from "../sequelize";
import { deleteFromS3 } from "../utils/s3";

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

  const exports = await Export.findAll({
    where: {
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
      e.state = "expired";
      await deleteFromS3(e.key);
      await e.save();
    })
  );

  ctx.body = {
    success: true,
  };
});

export default router;
