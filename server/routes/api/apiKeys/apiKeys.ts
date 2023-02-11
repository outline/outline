import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { ApiKey, Event } from "@server/models";
import { authorize } from "@server/policies";
import { presentApiKey } from "@server/presenters";
import { APIContext } from "@server/types";
import { assertUuid, assertPresent } from "@server/validation";
import pagination from "../middlewares/pagination";

const router = new Router();

router.post(
  "apiKeys.create",
  auth({ member: true }),
  async (ctx: APIContext) => {
    const { name } = ctx.request.body;
    assertPresent(name, "name is required");
    const { user } = ctx.state.auth;

    authorize(user, "createApiKey", user.team);
    const key = await ApiKey.create({
      name,
      userId: user.id,
    });

    await Event.create({
      name: "api_keys.create",
      modelId: key.id,
      teamId: user.teamId,
      actorId: user.id,
      data: {
        name,
      },
      ip: ctx.request.ip,
    });

    ctx.body = {
      data: presentApiKey(key),
    };
  }
);

router.post(
  "apiKeys.list",
  auth({ member: true }),
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
  auth({ member: true }),
  async (ctx: APIContext) => {
    const { id } = ctx.request.body;
    assertUuid(id, "id is required");
    const { user } = ctx.state.auth;
    const key = await ApiKey.findByPk(id);
    authorize(user, "delete", key);

    await key.destroy();
    await Event.create({
      name: "api_keys.delete",
      modelId: key.id,
      teamId: user.teamId,
      actorId: user.id,
      data: {
        name: key.name,
      },
      ip: ctx.request.ip,
    });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
