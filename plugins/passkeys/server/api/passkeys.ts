import auth from "@server/middlewares/authentication";
import { ValidationError } from "@server/errors";
import { UserPasskey } from "@server/models";
import { APIContext } from "@server/types";
import Router from "koa-router";

const router = new Router();

router.post("passkeys.list", auth(), async (ctx: APIContext) => {
  const user = ctx.state.auth.user;
  const passkeys = await UserPasskey.findAll({
    where: { userId: user.id },
    attributes: ["id", "createdAt", "updatedAt"],
  });
  ctx.body = { data: passkeys };
});

router.post("passkeys.delete", auth(), async (ctx: APIContext) => {
  const user = ctx.state.auth.user;
  const { id } = ctx.request.body as { id: string };

  if (!id) {
    throw ValidationError("Passkey ID is required");
  }

  const passkey = await UserPasskey.findOne({
    where: { id, userId: user.id },
  });

  if (!passkey) {
    throw ValidationError("Passkey not found or does not belong to you");
  }

  await passkey.destroy();

  ctx.body = { data: { success: true } };
});

export default router;
