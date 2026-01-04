import auth from "@server/middlewares/authentication";
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

export default router;
