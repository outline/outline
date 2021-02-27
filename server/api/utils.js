// @flow
import subDays from "date-fns/sub_days";
import debug from "debug";
import Router from "koa-router";
import { AuthenticationError } from "../errors";
import {
  Document,
  Team,
  User,
  AuthenticationProvider,
  UserAuthentication,
  Attachment,
} from "../models";
import { Op, sequelize } from "../sequelize";
import parseAttachmentIds from "../utils/parseAttachmentIds";

const router = new Router();
const log = debug("utils");

function authMiddleware(ctx, next: () => Promise<*>) {
  const { token } = ctx.body;

  if (process.env.UTILS_SECRET !== token) {
    throw new AuthenticationError("Invalid secret token");
  }

  return next();
}

router.post("utils.migrateAuthentication", authMiddleware, async (ctx) => {
  let { page = 0, limit = 1000 } = ctx.body;
  const cache = {};

  const process = async (page: number) => {
    log(`Migrating authentication data… page ${page}`);

    const users = await User.findAll({
      limit,
      offset: page * limit,
      paranoid: false,
      where: {
        serviceId: {
          [Op.ne]: "email",
        },
      },
      include: [
        {
          model: Team,
          as: "team",
          required: true,
          paranoid: false,
        },
      ],
    });

    for (const user of users) {
      for (const service of ["slack", "google"]) {
        const serviceId = user.team[`${service}Id`];
        if (!serviceId) {
          continue;
        }

        let authenticationProviderId = cache[serviceId];
        if (!authenticationProviderId) {
          const [
            authenticationProvider,
          ] = await AuthenticationProvider.findOrCreate({
            where: {
              name: service,
              serviceId,
              teamId: user.teamId,
            },
          });

          cache[serviceId] = authenticationProviderId =
            authenticationProvider.id;
        }

        try {
          await UserAuthentication.create({
            authenticationProviderId,
            serviceId: user.serviceId,
            teamId: user.teamId,
            userId: user.id,
          });
        } catch (err) {
          console.log(
            `serviceId ${user.serviceId} exists, for user ${user.id}`
          );
          continue;
        }
      }
    }

    return users.length === limit ? process(page + 1) : undefined;
  };

  await process(page);

  ctx.body = {
    success: true,
  };
});

router.post("utils.gc", authMiddleware, async (ctx) => {
  const { limit = 500 } = ctx.body;

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
