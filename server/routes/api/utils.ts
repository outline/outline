import { subDays } from "date-fns";
import Router from "koa-router";
import { Op } from "sequelize";
import documentPermanentDeleter from "@server/commands/documentPermanentDeleter";
import teamPermanentDeleter from "@server/commands/teamPermanentDeleter";
import { AuthenticationError } from "@server/errors";
import { Document, Team, FileOperation } from "@server/models";
import Logger from "../../logging/logger";

const router = new Router();

router.post("utils.gc", async (ctx) => {
  const { token, limit = 500 } = ctx.body;

  if (process.env.UTILS_SECRET !== token) {
    throw AuthenticationError("Invalid secret token");
  }

  Logger.info(
    "utils",
    `Permanently destroying upto ${limit} documents older than 30 days…`
  );
  const documents = await Document.scope("withDrafts").findAll({
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
  Logger.info("utils", `Destroyed ${countDeletedDocument} documents`);
  Logger.info(
    "utils",
    `Expiring all the collection export older than 30 days…`
  );
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
  Logger.info(
    "utils",
    `Permanently destroying upto ${limit} teams older than 30 days…`
  );
  const teams = await Team.findAll({
    where: {
      deletedAt: {
        [Op.lt]: subDays(new Date(), 30),
      },
    },
    paranoid: false,
    limit,
  });

  for (const team of teams) {
    await teamPermanentDeleter(team);
  }

  ctx.body = {
    success: true,
  };
});

export default router;
