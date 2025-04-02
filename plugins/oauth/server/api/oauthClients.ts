import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { authorize } from "@server/policies";
import { APIContext } from "@server/types";
import Router from "koa-router";
import OAuthClient from "../models/OAuthClient";
import presentOAuthClient from "../presenters/oauthClient";
import * as T from "./schema";

const router = new Router();

router.post(
  "oauthClients.create",
  auth(),
  validate(T.OAuthClientsCreateSchema),
  transaction(),
  async (ctx: APIContext<T.OAuthClientsCreateReq>) => {
    const input = ctx.input.body;
    const { user } = ctx.state.auth;

    // TODO: Switch policy
    authorize(user, "createApiKey", user.team);

    const oauthClient = await OAuthClient.createWithCtx(ctx, {
      ...input,
      teamId: user.teamId,
      createdById: user.id,
    });

    ctx.body = {
      data: presentOAuthClient(oauthClient),
    };
  }
);

export default router;
