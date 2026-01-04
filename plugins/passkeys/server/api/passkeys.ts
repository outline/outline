import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { ValidationError } from "@server/errors";
import { UserPasskey } from "@server/models";
import { APIContext } from "@server/types";
import Router from "koa-router";
import * as T from "./schema";

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

    const passkey = await UserPasskey.findOne({
      where: { id, userId: user.id },
    });

    if (!passkey) {
      throw ValidationError("Passkey not found or does not belong to you");
    }

    await passkey.destroy();

    ctx.body = { data: { success: true } };
  }
);

router.post(
  "passkeys.rename",
  auth(),
  validate(T.PasskeysRenameSchema),
  async (ctx: APIContext<T.PasskeysRenameReq>) => {
    const user = ctx.state.auth.user;
    const { id, name } = ctx.input.body;

    const passkey = await UserPasskey.findOne({
      where: { id, userId: user.id },
    });

    if (!passkey) {
      throw ValidationError("Passkey not found or does not belong to you");
    }

    passkey.name = name;
    await passkey.save();

    ctx.body = { data: { success: true, name: passkey.name } };
  }
);

export default router;
