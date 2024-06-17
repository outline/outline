import Router from "koa-router";
import { UserRole } from "@shared/types";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { ApiKey, Event } from "@server/models";
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
    const { name, expiryAt } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    authorize(user, "createApiKey", user.team);
    const key = await ApiKey.create(
      {
        name,
        userId: user.id,
        expiryAt,
      },
      { transaction }
    );

    await Event.createFromContext(
      ctx,
      {
        name: "api_keys.create",
        modelId: key.id,
        data: {
          name,
        },
      },
      { transaction }
    );

    ctx.body = {
      data: presentApiKey(key),
    };
  }
);

router.post(
  "apiKeys.list",
  auth({ role: UserRole.Member }),
  pagination(),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    const keys = await ApiKey.findAll({
      where: {
        userId: user.id,
      },
      order: [["createdAt", "DESC"]],
      offset: ctx.state.pagination.offset,
      limit: ctx.state.pagination.limit,
    });

    ctx.body = {
      pagination: ctx.state.pagination,
      data: keys.map(presentApiKey),
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

    await key.destroy({ transaction });
    await Event.createFromContext(
      ctx,
      {
        name: "api_keys.delete",
        modelId: key.id,
        data: {
          name: key.name,
        },
      },
      { transaction }
    );

    ctx.body = {
      success: true,
    };
  }
);

export default router;
