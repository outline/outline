import Router from "koa-router";
import { WhereOptions, Op } from "sequelize";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Emoji, User, Attachment } from "@server/models";
import BaseStorage from "@server/storage/files/BaseStorage";
import { authorize } from "@server/policies";
import { presentEmoji, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";
import { getTeamFromContext } from "@server/utils/passport";
import { loadPublicShare } from "@server/commands/shareLoader";
import { AuthorizationError } from "@server/errors";

const router = new Router();

router.post(
  "emojis.info",
  auth(),
  validate(T.EmojisInfoSchema),
  async (ctx: APIContext<T.EmojisInfoReq>) => {
    const { id, name } = ctx.input.body;
    const { user } = ctx.state.auth;

    const include = [
      {
        model: User,
        as: "createdBy",
        paranoid: false,
      },
      {
        model: Attachment,
        as: "attachment",
        paranoid: false,
      },
    ];

    let emoji;
    if (id) {
      emoji = await Emoji.findByPk(id, {
        rejectOnEmpty: true,
        include,
      });
    } else if (name) {
      emoji = await Emoji.findOne({
        where: {
          name,
          teamId: user.teamId,
        },
        include,
        rejectOnEmpty: true,
      });
    }

    authorize(user, "read", emoji);

    ctx.body = {
      data: presentEmoji(emoji),
      policies: presentPolicies(user, [emoji]),
    };
  }
);

router.get(
  "emojis.redirect",
  auth({ optional: true }),
  validate(T.EmojisRedirectSchema),
  async (ctx: APIContext<T.EmojisRedirectReq>) => {
    const { id, shareId } = ctx.input.query;
    const { user } = ctx.state.auth;

    const emoji = await Emoji.unscoped().findByPk(id, {
      rejectOnEmpty: true,
      include: [
        {
          model: Attachment,
        },
      ],
    });

    if (shareId) {
      const teamFromCtx = await getTeamFromContext(ctx, {
        includeStateCookie: false,
      });
      const { share } = await loadPublicShare({
        id: shareId,
        teamId: teamFromCtx?.id,
      });

      // Note: This is purposefully using a somewhat looser authorization check.
      // In order to load a custom emoji you must have a valid emoji ID and a
      // valid share ID from the same team.
      if (share.teamId !== emoji.teamId) {
        throw AuthorizationError();
      }
    } else {
      authorize(user, "read", emoji);
    }

    ctx.set(
      "Cache-Control",
      `max-age=${BaseStorage.defaultSignedUrlExpires}, immutable`
    );
    ctx.redirect(await emoji.attachment.signedUrl);
  }
);

router.post(
  "emojis.list",
  auth(),
  pagination(),
  validate(T.EmojisListSchema),
  async (ctx: APIContext<T.EmojisListReq>) => {
    const { user } = ctx.state.auth;
    const { query } = ctx.input.body;

    let where: WhereOptions<Emoji> = {
      teamId: user.teamId,
    };

    if (query) {
      where = {
        ...where,
        name: {
          [Op.iLike]: `%${query}%`,
        },
      };
    }

    const [emojis, total] = await Promise.all([
      Emoji.findAll({
        where,
        include: [
          {
            model: User,
            as: "createdBy",
            paranoid: false,
          },
          {
            model: Attachment,
            as: "attachment",
            paranoid: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        offset: ctx.state.pagination.offset,
        limit: ctx.state.pagination.limit,
      }),
      Emoji.count({
        where,
      }),
    ]);

    ctx.body = {
      pagination: { ...ctx.state.pagination, total },
      data: emojis.map(presentEmoji),
      policies: presentPolicies(user, emojis),
    };
  }
);

router.post(
  "emojis.create",
  rateLimiter(RateLimiterStrategy.TenPerMinute),
  auth(),
  validate(T.EmojisCreateSchema),
  transaction(),
  async (ctx: APIContext<T.EmojisCreateReq>) => {
    const { name, attachmentId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const attachment = await Attachment.findByPk(attachmentId, {
      transaction,
      rejectOnEmpty: true,
    });
    authorize(user, "read", attachment);

    const emoji = await Emoji.createWithCtx(ctx, {
      name,
      attachmentId,
      teamId: user.teamId,
      createdById: user.id,
      createdBy: user,
    });
    emoji.createdBy = user;
    emoji.attachment = attachment;

    ctx.body = {
      data: presentEmoji(emoji),
      policies: presentPolicies(user, [emoji]),
    };
  }
);

router.post(
  "emojis.delete",
  auth(),
  validate(T.EmojisDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.EmojisDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const emoji = await Emoji.findByPk(id, {
      transaction: ctx.state.transaction,
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", emoji);

    await emoji.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
