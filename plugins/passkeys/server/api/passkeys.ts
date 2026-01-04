import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { UserPasskey } from "@server/models";
import type { APIContext } from "@server/types";
import Router from "koa-router";
import * as T from "./schema";
import { authorize } from "@server/policies";

const router = new Router();

router.post(
  "passkeys.list",
  auth(),
  validate(T.PasskeysListSchema),
  async (ctx: APIContext<T.PasskeysListReq>) => {
    const user = ctx.state.auth.user;
    const passkeys = await UserPasskey.findAll({
      where: { userId: user.id },
      attributes: [
        "id",
        "name",
        "userAgent",
        "transports",
        "createdAt",
        "updatedAt",
      ],
    });
    ctx.body = { data: passkeys };
  }
);

router.post(
  "passkeys.delete",
  auth(),
  validate(T.PasskeysDeleteSchema),
  async (ctx: APIContext<T.PasskeysDeleteReq>) => {
    const user = ctx.state.auth.user;
    const { id } = ctx.input.body;

    const passkey = await UserPasskey.findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "delete", passkey);

    await passkey.destroyWithCtx(ctx);

    ctx.body = { data: { success: true } };
  }
);

router.post(
  "passkeys.update",
  auth(),
  validate(T.PasskeysUpdateSchema),
  async (ctx: APIContext<T.PasskeysUpdateReq>) => {
    const user = ctx.state.auth.user;
    const { id, name } = ctx.input.body;

    const passkey = await UserPasskey.findByPk(id, {
      rejectOnEmpty: true,
    });
    authorize(user, "update", passkey);

    await passkey.updateWithCtx(ctx, {
      name,
    });

    ctx.body = { data: { success: true, name: passkey.name } };
  }
);

export default router;
