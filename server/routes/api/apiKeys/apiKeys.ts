import Router from "koa-router";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { ApiKey } from "@server/models";
import { authorize } from "@server/policies";
import { presentApiKey } from "@server/presenters";
import { APIContext, AuthenticationType } from "@server/types";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
  "apiKeys.create",
  auth({ role: UserRole.Member, type: AuthenticationType.APP }),
  validate(T.APIKeysCreateSchema),
  transaction(),
  async (ctx: APIContext<T.APIKeysCreateReq>) => {
    const { name, expiresAt } = ctx.input.body;
    const { user } = ctx.state.auth;

    authorize(user, "createApiKey", user.team);
    const apiKey = await ApiKey.createWithCtx(ctx, {
      name,
      userId: user.id,
      expiresAt,
    });

    ctx.body = {
      data: presentApiKey(apiKey),
    };
  }
);

router.post(
  "apiKeys.list",
  auth({ role: UserRole.Member }),
  pagination(),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    const { pagination } = ctx.state;

    const apiKeys = await ApiKey.findAll({
      where: {
        userId: user.id,
      },
      order: [["createdAt", "DESC"]],
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
  auth({ role: UserRole.Member }),
  validate(T.APIKeysDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.APIKeysDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const key = await ApiKey.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
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
