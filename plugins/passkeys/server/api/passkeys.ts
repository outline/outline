import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { UserPasskey } from "@server/models";
import type { APIContext } from "@server/types";
import Router from "koa-router";
import * as T from "./schema";
import { authorize } from "@server/policies";
import { transaction } from "@server/middlewares/transaction";
import pagination from "@server/routes/api/middlewares/pagination";
import presentUserPasskey from "../presenters/userPasskey";

const router = new Router();

router.post(
  "passkeys.list",
  auth(),
  pagination(),
  validate(T.PasskeysListSchema),
  async (ctx: APIContext<T.PasskeysListReq>) => {
    const { user } = ctx.state.auth;
    const { pagination } = ctx.state;

    const passkeys = await UserPasskey.findAll({
      where: { userId: user.id },
      order: [["createdAt", "DESC"]],
      offset: pagination.offset,
      limit: pagination.limit,
    });

    ctx.body = {
      pagination,
      data: passkeys.map(presentUserPasskey),
    };
  }
);

router.post(
  "passkeys.update",
  auth(),
  validate(T.PasskeysUpdateSchema),
  transaction(),
  async (ctx: APIContext<T.PasskeysUpdateReq>) => {
    const { id, name } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const passkey = await UserPasskey.findByPk(id, {
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "update", passkey);

    await passkey.updateWithCtx(ctx, {
      name,
    });

    ctx.body = { data: presentUserPasskey(passkey) };
  }
);

router.post(
  "passkeys.delete",
  auth(),
  validate(T.PasskeysDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.PasskeysDeleteReq>) => {
    const { id } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    const passkey = await UserPasskey.findByPk(id, {
      rejectOnEmpty: true,
      lock: transaction.LOCK.UPDATE,
    });
    authorize(user, "delete", passkey);

    await passkey.destroyWithCtx(ctx);

    ctx.body = {
      success: true,
    };
  }
);

export default router;
