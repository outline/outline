import Router from "koa-router";
import { WhereOptions } from "sequelize";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Emoji, Team, User } from "@server/models";
import { authorize } from "@server/policies";
import { presentEmoji, presentPolicies } from "@server/presenters";
import { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "emojis.list",
  auth(),
  pagination(),
  validate(T.EmojisListSchema),
  async (ctx: APIContext<T.EmojisListReq>) => {
    const { teamId } = ctx.input.body;
    const { user } = ctx.state.auth;

    // Use provided teamId or default to user's team
    const targetTeamId = teamId || user.teamId;

    // Verify user has access to the team
    if (targetTeamId !== user.teamId && !user.isAdmin) {
      const team = await Team.findByPk(targetTeamId);
      authorize(user, "read", team);
    }

    const where: WhereOptions<Emoji> = {
      teamId: targetTeamId,
    };

    const include = [
      {
        model: User,
        as: "createdBy",
        required: true,
      },
    ];

    const [emojis, total] = await Promise.all([
      Emoji.findAll({
        where,
        include,
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
    const { name, url } = ctx.input.body;
    const { auth: authState, transaction } = ctx.state;
    const { user } = authState;

    // Check if emoji name already exists for this team
    const existingEmoji = await Emoji.findOne({
      where: {
        teamId: user.teamId,
        name,
      },
      transaction,
    });

    if (existingEmoji) {
      ctx.throw(400, `An emoji with the name "${name}" already exists`);
    }

    const emoji = await Emoji.create(
      {
        name,
        url,
        teamId: user.teamId,
        createdById: user.id,
      },
      {
        transaction,
      }
    );

    // Load the created emoji with associations
    const emojiWithAssociations = await Emoji.findByPk(emoji.id, {
      include: [
        {
          model: User,
          as: "createdBy",
          required: true,
        },
      ],
      transaction,
    });

    ctx.body = {
      data: presentEmoji(emojiWithAssociations!),
      policies: presentPolicies(user, [emojiWithAssociations!]),
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
    const { auth: authState, transaction } = ctx.state;
    const { user } = authState;

    const emoji = await Emoji.findByPk(id, {
      transaction,
    });

    if (!emoji) {
      ctx.throw(404, "Emoji not found");
    }

    // Check if user has permission to delete this emoji
    authorize(user, "delete", emoji);

    await emoji.destroy({ transaction });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
