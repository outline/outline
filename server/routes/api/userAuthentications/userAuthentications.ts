import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { UserAuthentication } from "@server/models";
import { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

router.post(
  "userAuthentications.delete",
  auth(),
  validate(T.UserAuthenticationsDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.UserAuthenticationsDeleteReq>) => {
    const { authenticationProviderId } = ctx.input.body;
    const { user } = ctx.state.auth;
    const { transaction } = ctx.state;

    await UserAuthentication.destroy({
      where: {
        userId: user.id,
        authenticationProviderId,
      },
      transaction,
    });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
