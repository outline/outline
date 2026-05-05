import Router from "koa-router";
import { Op, Sequelize, type WhereOptions } from "sequelize";
import { Scope, UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { ApiKey, User } from "@server/models";
import { authorize, cannot } from "@server/policies";
import { presentApiKey } from "@server/presenters";
import type { APIContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

const globalScopes = new Set<string>(Object.values(Scope));

router.post(
  "apiKeys.create",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth({
    role: UserRole.Member,
    type: AuthenticationType.APP,
  }),
  validate(T.APIKeysCreateSchema),
  transaction(),
  async (ctx: APIContext<T.APIKeysCreateReq>) => {
    const { name, scope, expiresAt } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createApiKey", user.team);

    const apiKey = await ApiKey.createWithCtx(ctx, {
      name,
      userId: user.id,
      expiresAt,
      scope: scope?.map((s) =>
        s.startsWith("/api/") || s.includes(":") || globalScopes.has(s)
          ? s
          : `/api/${s.replace(/^\//, "")}`
      ),
    });

    apiKey.user = user;

    ctx.body = {
      data: presentApiKey(apiKey),
    };
  }
);

router.post(
  "apiKeys.list",
  auth({ role: UserRole.Member }),
  pagination(),
  validate(T.APIKeysListSchema),
  async (ctx: APIContext<T.APIKeysListReq>) => {
    const { userId, query, sort, direction } = ctx.input.body;
    const { pagination } = ctx.state;
    const actor = ctx.state.auth.user;

    let userWhere: WhereOptions<User> = {
      teamId: actor.teamId,
    };

    if (cannot(actor, "listApiKeys", actor.team)) {
      userWhere = {
        ...userWhere,
        id: actor.id,
      };
    }

    if (userId) {
      const user = await User.findByPk(userId);
      authorize(actor, "listApiKeys", user);

      userWhere = {
        ...userWhere,
        id: userId,
      };
    }

    let where: WhereOptions<ApiKey> = {};

    if (query) {
      where = {
        ...where,
        [Op.and]: [
          Sequelize.literal(
            `unaccent(LOWER("apiKey"."name")) like unaccent(LOWER(:query))`
          ),
        ],
      };
    }

    const replacements = { query: `%${query}%` };

    const apiKeys = await ApiKey.findAll({
      where,
      replacements,
      include: [
        {
          model: User,
          required: true,
          where: userWhere,
        },
      ],
      order: [[sort, direction]],
      offset: pagination.offset,
      limit: pagination.limit,
    });

    ctx.body = {
      pagination,
      data: apiKeys.map(presentApiKey),
    };
  }
);

router.post(
  "apiKeys.delete",
  auth({
    role: UserRole.Member,
    type: AuthenticationType.APP,
  }),
  validate(T.APIKeysDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.APIKeysDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const key = await ApiKey.scope("withUser").findByPk(id, {
      lock: {
        level: transaction.LOCK.UPDATE,
        of: ApiKey,
      },
      transaction,
    });
    authorize(user, "delete", key);

    await key.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
